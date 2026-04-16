// kuppography ロゴ — 修正後ロゴ.jpg に完全準拠
// 3つの円: 大円(左上)・中円(右)・小円(中央交差)

interface SymbolProps {
  size?: number;
  color?: string;
  className?: string;
}

// シンボルマークのみ（トップページ中央配置用）
export function KuppographySymbol({ size = 80, color = "#1a1a1a", className = "" }: SymbolProps) {
  // viewBox 100x80 — 修正後ロゴに基づく正確な座標
  // 大円: cx=40 cy=35 r=26
  // 中円: cx=62 cy=45 r=18
  // 小円: cx=53 cy=41 r=10  ← 大円と中円が交差する領域の中央
  const w = 100;
  const h = 80;
  return (
    <svg
      width={size}
      height={size * h / w}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="40" cy="35" r="26" stroke={color} strokeWidth="1.5" />
      <circle cx="63" cy="45" r="18" stroke={color} strokeWidth="1.5" />
      <circle cx="53" cy="41" r="10" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ナビ用: シンボル + "kuppography" テキスト横並び
export function KuppographyLogo({
  height = 32,
  color = "#1a1a1a",
  className = "",
}: {
  height?: number;
  color?: string;
  className?: string;
}) {
  // シンボルのアスペクト比は 100:80 = 5:4
  const symW = height * (100 / 80);
  const fontSize = height * 0.36;

  return (
    <div className={`flex items-center gap-2 ${className}`} style={{ height }}>
      <KuppographySymbol size={symW} color={color} />
      <span
        style={{
          fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
          fontWeight: 300,
          letterSpacing: "0.16em",
          fontSize,
          color,
          lineHeight: 1,
          paddingBottom: 1,
        }}
      >
        kuppography
      </span>
    </div>
  );
}

// トップページ中央用: シンボル + テキスト縦並び（修正後ロゴ.jpg と同じレイアウト）
export function KuppographyLogoVertical({
  symbolSize = 100,
  color = "#1a1a1a",
  className = "",
}: {
  symbolSize?: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <KuppographySymbol size={symbolSize} color={color} />
      <span
        style={{
          fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
          fontWeight: 300,
          letterSpacing: "0.22em",
          fontSize: symbolSize * 0.16,
          color,
          lineHeight: 1,
        }}
      >
        kuppography
      </span>
    </div>
  );
}
