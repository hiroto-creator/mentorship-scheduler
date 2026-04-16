import Link from "next/link";
import { ArrowRight } from "lucide-react";

const BG = "#EBEBEB";
// Phase 1: 統一グレー色
const GRAY_TEXT = "#aaa";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      {/* Nav */}
      <nav className="px-8 h-14 flex items-center justify-between border-b" style={{ borderColor: "#d4d4d4" }}>
        <span style={{
          fontFamily: "'Helvetica Neue','Arial',sans-serif",
          fontWeight: 200,
          fontSize: "14px",
          letterSpacing: "0.18em",
          color: "#1a1a1a",
        }}>kuppography</span>
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: "#888", fontFamily: "'Hiragino Kaku Gothic ProN',sans-serif" }}>
          管理画面 <ArrowRight className="w-3 h-3" />
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center">

          {/* kuppography — Phase 1: 小さく、photo mentorshipと同じグレー色 */}
          <div style={{ marginBottom: "16px" }}>
            <span style={{
              fontFamily: "'Helvetica Neue','Arial',sans-serif",
              fontWeight: 200,
              fontSize: "clamp(0.85rem, 2vw, 1.1rem)",
              letterSpacing: "0.20em",
              color: GRAY_TEXT,  // photo mentorshipと同じ色
              display: "block",
              lineHeight: 1,
            }}>
              kuppography
            </span>
          </div>

          {/* photo mentorship — Phase 1: 大きく */}
          <p style={{
            fontFamily: "'Helvetica Neue','Arial',sans-serif",
            fontWeight: 200,
            fontSize: "clamp(1.6rem, 5vw, 3rem)",
            letterSpacing: "0.18em",
            color: GRAY_TEXT,
            marginBottom: "52px",
            lineHeight: 1,
          }}>
            photo mentorship
          </p>

          <Link href="/admin"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 text-white text-sm rounded-xl transition-all hover:opacity-80"
            style={{ background: "#1a1a1a", fontFamily: "'Hiragino Kaku Gothic ProN',sans-serif" }}>
            イベントを作成する <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <footer className="border-t px-8 h-12 flex items-center" style={{ borderColor: "#d4d4d4" }}>
        <p style={{ fontSize: "11px", color: "#bbb", fontFamily: "'Helvetica Neue',sans-serif", fontWeight: 300 }}>
          © {new Date().getFullYear()} kuppography
        </p>
      </footer>
    </div>
  );
}
