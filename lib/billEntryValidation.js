function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseNonNegativeMoney(value, fieldLabel) {
  if (value === undefined || value === null || value === "") {
    return { value: 0 };
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return { error: `${fieldLabel} must be a non-negative number` };
  }
  return { value: round2(num) };
}

/**
 * Validates bill line items and monetary charges, then recomputes
 * `total_bill` and `due_advance` server-side so client tampering cannot
 * corrupt ledger totals.
 */
export function validateAndComputeBillTotals(body = {}) {
  if (body.items !== undefined && !Array.isArray(body.items)) {
    return { error: "Items must be an array" };
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const sanitizedItems = [];
  let itemsSubtotal = 0;

  for (let i = 0; i < rawItems.length; i += 1) {
    const item = rawItems[i] || {};
    const hasQty = item.quantity !== undefined && item.quantity !== null && item.quantity !== "";
    const hasRate = item.rate !== undefined && item.rate !== null && item.rate !== "";
    const hasSub = item.subtotal !== undefined && item.subtotal !== null && item.subtotal !== "";

    const qty = hasQty ? Number(item.quantity) : 0;
    const rate = hasRate ? Number(item.rate) : 0;
    const rawSub = hasSub ? Number(item.subtotal) : 0;

    if ((hasQty && (!Number.isFinite(qty) || qty < 0)) ||
        (hasRate && (!Number.isFinite(rate) || rate < 0)) ||
        (hasSub && (!Number.isFinite(rawSub) || rawSub < 0))) {
      return { error: `Item #${i + 1} contains negative or invalid numeric values` };
    }

    const itemSubtotal = hasQty && hasRate ? round2(qty * rate) : round2(rawSub);
    itemsSubtotal = round2(itemsSubtotal + itemSubtotal);

    sanitizedItems.push({
      ...item,
      subtotal: itemSubtotal,
    });
  }

  const labourRes = parseNonNegativeMoney(body.labour_charge, "Labour charge");
  if (labourRes.error) return { error: labourRes.error };

  const transportRes = parseNonNegativeMoney(body.transport_cost, "Transport cost");
  if (transportRes.error) return { error: transportRes.error };

  const discountRes = parseNonNegativeMoney(body.discount, "Discount");
  if (discountRes.error) return { error: discountRes.error };

  const paymentRes = parseNonNegativeMoney(body.client_payment, "Client payment");
  if (paymentRes.error) return { error: paymentRes.error };

  // Opening balance entries ("Previous Advance Payment" / "Previous Due Balance")
  if (body.is_opening_balance === true && sanitizedItems.length === 1) {
    const firstName = sanitizedItems[0]?.name;
    const amt = round2(sanitizedItems[0]?.subtotal || 0);
    if (firstName === "Previous Advance Payment") {
      if (amt <= 0) {
        return { error: "Previous advance amount must be greater than 0" };
      }
      return {
        items: sanitizedItems,
        labour_charge: 0,
        transport_cost: 0,
        discount: 0,
        total_bill: 0,
        client_payment: amt,
        due_advance: round2(-amt),
      };
    }
    if (firstName === "Previous Due Balance") {
      if (amt <= 0) {
        return { error: "Previous due amount must be greater than 0" };
      }
      return {
        items: sanitizedItems,
        labour_charge: 0,
        transport_cost: 0,
        discount: 0,
        total_bill: amt,
        client_payment: 0,
        due_advance: amt,
      };
    }
  }

  const grossTotal = round2(itemsSubtotal + labourRes.value + transportRes.value);
  if (discountRes.value > grossTotal) {
    return { error: "Discount cannot exceed the gross bill total" };
  }

  const total_bill = round2(grossTotal - discountRes.value);
  let due_advance = round2(total_bill - paymentRes.value);
  if (Math.abs(due_advance) < 0.005) {
    due_advance = 0;
  }

  return {
    items: sanitizedItems,
    labour_charge: labourRes.value,
    transport_cost: transportRes.value,
    discount: discountRes.value,
    total_bill,
    client_payment: paymentRes.value,
    due_advance,
  };
}

