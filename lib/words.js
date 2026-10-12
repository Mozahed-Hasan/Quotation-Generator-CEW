const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const below100 = (n) => (n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : ""));
const below1000 = (n) =>
  (n >= 100 ? ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " : "") : "") + (n % 100 ? below100(n % 100) : "");

// Bangladeshi/Indian numbering: Thousand, Lakh, Crore
export function numberToWords(num) {
  num = Math.floor(Math.abs(Number(num) || 0));
  if (num === 0) return "Zero";
  const parts = [];
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const rest = num % 1000;
  if (crore) parts.push(numberToWords(crore) + " Crore");
  if (lakh) parts.push(below100(lakh) + " Lakh");
  if (thousand) parts.push(below100(thousand) + " Thousand");
  if (rest) parts.push(below1000(rest));
  return parts.join(" ");
}

// e.g. "Seven lac two thousand three hundred twenty taka only."
export function takaInWords(amount) {
  const n = Number(amount);
  if (isNaN(n) || amount === "" || amount === null || amount === undefined) return "";
  if (n === 0) return "Zero taka only.";
  const taka = Math.floor(Math.abs(n));
  const paisa = Math.round((Math.abs(n) - taka) * 100);
  const s = `${numberToWords(taka)} taka${paisa ? " and " + numberToWords(paisa) + " paisa" : ""} only.`
    .toLowerCase()
    .replace("lakh", "lac");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
