import { Noto_Serif_Bengali } from "next/font/google";
import "./bill.css";

const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
});

export const metadata = {
  title: "বিল ক্যালকুলেটর | CEW ডিলার হিসাব",
  description: "ডিলারদের বিল, পেমেন্ট ও ব্যালেন্স হিসাব রাখার আধুনিক ওয়েব অ্যাপ",
};

export default function BillLayout({ children }) {
  return (
    <div className={`bill-calc-scope ${notoSerifBengali.variable} ${notoSerifBengali.className}`}>
      {children}
    </div>
  );
}
