"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  FlameIcon,
  TrophyIcon,
  InstagramIcon,
  DownloadIcon,
  CopyIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type StoryData = {
  dayNumber: number;
  arcLength: number;
  streak: number;
  bestStreak: number;
  statement: string;
  focusKind: string;
  xp: number;
  consistency: number;
  completedDays: number;
  user: {
    name: string | null;
    username: string | null;
    image: string | null;
  };
  badges: Array<{
    key: string;
    name: string;
    description: string;
    icon: string;
    xpReward: number;
  }>;
};

type ThemeKey = "obsidian" | "frost" | "brutalist" | "crimson";
type LayoutPreset = "streak" | "achievement" | "metrics" | "manifesto";

const THEMES: Record<
  ThemeKey,
  {
    name: string;
    bgClass: string;
    accentColor: string;
    accentBg: string;
    borderClass: string;
    glowClass: string;
    canvasBgStart: string;
    canvasBgMid: string;
    canvasBgEnd: string;
    canvasAccent: string;
    canvasAccentMuted: string;
    canvasText: string;
    canvasTextMuted: string;
  }
> = {
  obsidian: {
    name: "Obsidian",
    bgClass: "from-[#0a0c10] via-[#121620] to-[#080a0e]",
    accentColor: "text-amber-400",
    accentBg: "bg-amber-400/10 text-amber-400 border-amber-400/30",
    borderClass: "border-amber-400/20",
    glowClass: "shadow-[0_0_40px_rgba(245,158,11,0.12)]",
    canvasBgStart: "#0a0c10",
    canvasBgMid: "#131722",
    canvasBgEnd: "#080a0e",
    canvasAccent: "#F59E0B",
    canvasAccentMuted: "#785312",
    canvasText: "#FFFFFF",
    canvasTextMuted: "#8E95A5",
  },
  frost: {
    name: "Frost Arc",
    bgClass: "from-[#050B16] via-[#0C172F] to-[#040812]",
    accentColor: "text-cyan-400",
    accentBg: "bg-cyan-400/10 text-cyan-400 border-cyan-400/30",
    borderClass: "border-cyan-400/20",
    glowClass: "shadow-[0_0_40px_rgba(56,189,248,0.14)]",
    canvasBgStart: "#050B16",
    canvasBgMid: "#0D1A35",
    canvasBgEnd: "#040812",
    canvasAccent: "#38BDF8",
    canvasAccentMuted: "#0C4A6E",
    canvasText: "#FFFFFF",
    canvasTextMuted: "#94A3B8",
  },
  brutalist: {
    name: "Brutalist",
    bgClass: "from-[#000000] via-[#0d0d0d] to-[#000000]",
    accentColor: "text-white",
    accentBg: "bg-white/10 text-white border-white/40",
    borderClass: "border-white/30",
    glowClass: "shadow-[0_0_30px_rgba(255,255,255,0.08)]",
    canvasBgStart: "#000000",
    canvasBgMid: "#0E0E0E",
    canvasBgEnd: "#000000",
    canvasAccent: "#FFFFFF",
    canvasAccentMuted: "#404040",
    canvasText: "#FFFFFF",
    canvasTextMuted: "#A3A3A3",
  },
  crimson: {
    name: "Crimson",
    bgClass: "from-[#0d0608] via-[#1a0b10] to-[#080405]",
    accentColor: "text-rose-500",
    accentBg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    borderClass: "border-rose-500/20",
    glowClass: "shadow-[0_0_40px_rgba(244,63,94,0.14)]",
    canvasBgStart: "#0d0608",
    canvasBgMid: "#1C0D12",
    canvasBgEnd: "#080405",
    canvasAccent: "#F43F5E",
    canvasAccentMuted: "#881337",
    canvasText: "#FFFFFF",
    canvasTextMuted: "#A1A1AA",
  },
};

const HEADLINE_PRESETS = [
  "LOCKED IN",
  "NO EXCUSES",
  "RELENTLESS",
  "DISCIPLINE > MOTIVATION",
  "SHOWING UP DAILY",
  "WINTER ARC PROTOCOL",
];

export function StoryCardStudio({ data }: { data: StoryData }) {
  const [theme, setTheme] = useState<ThemeKey>("obsidian");
  const [layout, setLayout] = useState<LayoutPreset>("streak");

  // Editable fields
  const [headline, setHeadline] = useState(`DAY ${data.dayNumber} // LOCKED IN`);
  const [quote, setQuote] = useState(data.statement || "Silence. Focus. Execution.");
  const [note, setNote] = useState("Showing up every single day. Consistency is the only hack.");
  const [dayNumber, setDayNumber] = useState(data.dayNumber || 1);
  const [arcLength, setArcLength] = useState(data.arcLength || 90);
  const [streak, setStreak] = useState(data.streak || 0);
  const [xp, setXp] = useState(data.xp || 0);
  const [consistency, setConsistency] = useState(data.consistency || 100);

  // Selected badge to feature
  const [selectedBadgeKey, setSelectedBadgeKey] = useState<string | null>(
    data.badges[0]?.key ?? "FIRST_STEP",
  );

  // Toggles
  const [showStreak, setShowStreak] = useState(true);
  const [showDay, setShowDay] = useState(true);
  const [showXp, setShowXp] = useState(true);
  const [showConsistency, setShowConsistency] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);

  // Status & feedback
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [showModal, setShowModal] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentBadge = useMemo(() => {
    return (
      data.badges.find((b) => b.key === selectedBadgeKey) ??
      (data.badges[0] || {
        key: "FIRST_STEP",
        name: "First Day",
        description: "Completed Day 1 of Arc",
        icon: "step",
        xpReward: 25,
      })
    );
  }, [data.badges, selectedBadgeKey]);

  // Render 1080x1920 to canvas
  const renderCanvas = useCallback((): HTMLCanvasElement | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    const t = THEMES[theme];

    // 1. Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, t.canvasBgStart);
    bgGrad.addColorStop(0.5, t.canvasBgMid);
    bgGrad.addColorStop(1, t.canvasBgEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle radial glow in upper-center
    const radial = ctx.createRadialGradient(width / 2, 600, 50, width / 2, 600, 700);
    radial.addColorStop(0, t.canvasAccent + "22");
    radial.addColorStop(1, "transparent");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // 3. Subtle grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
    ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = gridSize; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = gridSize; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Outer framing border
    ctx.strokeStyle = t.canvasAccent + "33";
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, width - 120, height - 120);

    // 4. Header: ARC // WINTER ARC
    ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = t.canvasAccent;
    ctx.letterSpacing = "6px";
    ctx.textAlign = "left";
    ctx.fillText("ARC // WINTER ARC", 100, 140);

    const userHandle = data.user.username ? `@${data.user.username}` : data.user.name ?? "WINTER ARCHITECT";
    ctx.font = "500 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = t.canvasTextMuted;
    ctx.letterSpacing = "2px";
    ctx.textAlign = "right";
    ctx.fillText(userHandle.toUpperCase(), width - 100, 140);

    // Header divider line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(100, 170);
    ctx.lineTo(width - 100, 170);
    ctx.stroke();

    // 5. Hero based on Layout Preset
    if (layout === "streak") {
      // Big Streak Hero
      const pillY = 280;
      ctx.fillStyle = t.canvasAccent + "18";
      ctx.strokeStyle = t.canvasAccent + "55";
      ctx.lineWidth = 1.5;
      drawRoundRect(ctx, width / 2 - 170, pillY, 340, 54, 27, true, true);

      ctx.fillStyle = t.canvasAccent;
      ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.letterSpacing = "4px";
      ctx.textAlign = "center";
      ctx.fillText("UNBROKEN STREAK", width / 2, pillY + 34);

      // Streak number
      ctx.font = "900 200px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasText;
      ctx.letterSpacing = "-4px";
      ctx.fillText(String(streak), width / 2, 530);

      ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasAccent;
      ctx.letterSpacing = "8px";
      ctx.fillText("DAYS CONSISTENT", width / 2, 590);
    } else if (layout === "achievement") {
      // Achievement Badge Hero
      const centerY = 410;
      // Outer medal glow ring
      ctx.beginPath();
      ctx.arc(width / 2, centerY, 130, 0, Math.PI * 2);
      ctx.fillStyle = t.canvasAccent + "15";
      ctx.fill();
      ctx.strokeStyle = t.canvasAccent + "66";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner medal circle
      ctx.beginPath();
      ctx.arc(width / 2, centerY, 95, 0, Math.PI * 2);
      ctx.fillStyle = t.canvasBgMid;
      ctx.fill();
      ctx.strokeStyle = t.canvasAccent;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Trophy / Star glyph inside medal
      ctx.font = "72px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🏆", width / 2, centerY + 26);

      // Badge title
      ctx.font = "bold 44px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasText;
      ctx.letterSpacing = "3px";
      ctx.fillText(currentBadge.name.toUpperCase(), width / 2, centerY + 190);

      // Badge unlock / description
      ctx.font = "500 26px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasAccent;
      ctx.letterSpacing = "1px";
      ctx.fillText(`+${currentBadge.xpReward} XP UNLOCKED`, width / 2, centerY + 235);
    } else if (layout === "metrics") {
      // 4 Metrics Grid
      const gridY = 270;
      const cardW = 410;
      const cardH = 170;
      const gap = 30;
      const leftCol = 105;
      const rightCol = leftCol + cardW + gap;

      const cards = [
        { label: "CURRENT DAY", val: `DAY ${dayNumber}`, sub: `OF ${arcLength} DAYS` },
        { label: "ACTIVE STREAK", val: `${streak} DAYS`, sub: `BEST: ${data.bestStreak} DAYS` },
        { label: "EXPERIENCE", val: `${xp.toLocaleString()} XP`, sub: "ACCUMULATED" },
        { label: "DISCIPLINE RATE", val: `${consistency}%`, sub: `${data.completedDays} DAYS DONE` },
      ];

      cards.forEach((c, idx) => {
        const x = idx % 2 === 0 ? leftCol : rightCol;
        const y = idx < 2 ? gridY : gridY + cardH + gap;

        ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1.5;
        drawRoundRect(ctx, x, y, cardW, cardH, 20, true, true);

        ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = t.canvasAccent;
        ctx.letterSpacing = "3px";
        ctx.textAlign = "left";
        ctx.fillText(c.label, x + 30, y + 45);

        ctx.font = "900 46px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = t.canvasText;
        ctx.letterSpacing = "-1px";
        ctx.fillText(c.val, x + 30, y + 105);

        ctx.font = "500 20px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = t.canvasTextMuted;
        ctx.letterSpacing = "1px";
        ctx.fillText(c.sub, x + 30, y + 140);
      });
    } else {
      // Manifesto Hero
      const quoteY = 320;
      ctx.font = "900 120px serif";
      ctx.fillStyle = t.canvasAccent + "44";
      ctx.textAlign = "left";
      ctx.fillText("“", 100, quoteY + 40);

      ctx.font = "italic 800 48px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasText;
      ctx.letterSpacing = "1px";
      wrapText(ctx, `"${quote.toUpperCase()}"`, 110, quoteY + 90, 860, 68, 4);

      ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasAccent;
      ctx.letterSpacing = "5px";
      ctx.fillText("— THE WINTER ARC MANIFESTO", 110, quoteY + 310);
    }

    // 6. Center: Editable Headline
    const headlineY = layout === "metrics" ? 700 : layout === "manifesto" ? 720 : 690;
    ctx.textAlign = "center";
    ctx.font = "900 68px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = t.canvasText;
    ctx.letterSpacing = "2px";
    wrapText(ctx, headline.toUpperCase(), width / 2, headlineY, 900, 78, 2);

    // 7. Note / Daily Statement Box
    const boxY = headlineY + 130;
    const boxH = 260;
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.strokeStyle = t.canvasAccent + "33";
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, 100, boxY, width - 200, boxH, 24, true, true);

    // Left vertical accent stripe on note box
    ctx.fillStyle = t.canvasAccent;
    drawRoundRect(ctx, 100, boxY, 8, boxH, 4, true, false);

    ctx.textAlign = "left";
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = t.canvasAccent;
    ctx.letterSpacing = "3px";
    ctx.fillText("DAILY LOG // DISCIPLINE STATEMENT", 140, boxY + 50);

    ctx.font = "400 32px -apple-system, BlinkMacSystemFont, Georgia, sans-serif";
    ctx.fillStyle = "#E2E8F0";
    wrapText(ctx, `"${quote}"`, 140, boxY + 110, 800, 44, 2);

    if (note) {
      ctx.font = "400 24px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasTextMuted;
      wrapText(ctx, note, 140, boxY + 205, 800, 36, 2);
    }

    // 8. Stats Strip (Bottom quadrant)
    const stripY = boxY + boxH + 60;
    const statItems: Array<{ label: string; value: string; show: boolean }> = [
      { label: "DAY", value: `${dayNumber}/${arcLength}`, show: showDay },
      { label: "STREAK", value: `${streak}d 🔥`, show: showStreak },
      { label: "XP", value: `${xp.toLocaleString()}`, show: showXp },
      { label: "RATE", value: `${consistency}%`, show: showConsistency },
    ].filter((s) => s.show);

    if (statItems.length > 0) {
      const colWidth = (width - 200) / statItems.length;
      statItems.forEach((st, idx) => {
        const cx = 100 + colWidth * idx + colWidth / 2;
        ctx.textAlign = "center";
        ctx.font = "500 20px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = t.canvasTextMuted;
        ctx.letterSpacing = "2px";
        ctx.fillText(st.label, cx, stripY + 20);

        ctx.font = "bold 44px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = t.canvasText;
        ctx.letterSpacing = "0px";
        ctx.fillText(st.value, cx, stripY + 70);

        // Divider between stats
        if (idx < statItems.length - 1) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.beginPath();
          ctx.moveTo(100 + colWidth * (idx + 1), stripY + 10);
          ctx.lineTo(100 + colWidth * (idx + 1), stripY + 80);
          ctx.stroke();
        }
      });
    }

    // 9. Arc Progress Bar
    const barY = stripY + 130;
    const barW = width - 200;
    const progress = Math.min(1, Math.max(0, dayNumber / arcLength));

    // Track
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    drawRoundRect(ctx, 100, barY, barW, 14, 7, true, false);

    // Filled progress
    if (progress > 0) {
      const barGrad = ctx.createLinearGradient(100, 0, 100 + barW * progress, 0);
      barGrad.addColorStop(0, t.canvasAccentMuted);
      barGrad.addColorStop(1, t.canvasAccent);
      ctx.fillStyle = barGrad;
      drawRoundRect(ctx, 100, barY, Math.max(20, barW * progress), 14, 7, true, false);
    }

    // Progress percentage & days label
    ctx.textAlign = "left";
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = t.canvasTextMuted;
    ctx.letterSpacing = "2px";
    ctx.fillText(`PROGRESS: ${Math.round(progress * 100)}% COMPLETE`, 100, barY + 44);

    ctx.textAlign = "right";
    ctx.fillText(`${arcLength - dayNumber} DAYS REMAINING`, width - 100, barY + 44);

    // 10. Footer / Watermark
    if (showWatermark) {
      const footerY = height - 120;
      ctx.textAlign = "center";
      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasAccent;
      ctx.letterSpacing = "6px";
      ctx.fillText("BUILT ON ARC PROTOCOL", width / 2, footerY);

      ctx.font = "500 18px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasTextMuted;
      ctx.letterSpacing = "3px";
      ctx.fillText("DISCIPLINE • EXECUTION • ZERO COMPROMISE", width / 2, footerY + 34);
    }

    return canvas;
  }, [
    theme,
    layout,
    headline,
    quote,
    note,
    dayNumber,
    arcLength,
    streak,
    xp,
    consistency,
    currentBadge,
    data,
    showStreak,
    showDay,
    showXp,
    showConsistency,
    showWatermark,
  ]);

  // Generate PNG Blob
  const getBlob = useCallback(async (): Promise<Blob | null> => {
    const canvas = renderCanvas();
    if (!canvas) return null;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
    });
  }, [renderCanvas]);

  // Handle Share to Instagram Story
  const handleShareStory = async () => {
    setIsGenerating(true);
    setFeedback(null);
    try {
      const blob = await getBlob();
      if (!blob) throw new Error("Could not render image");

      const fileName = `winter-arc-day-${dayNumber}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      // 1. Mobile Web Share API: triggers native OS share sheet with Instagram Stories
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Winter Arc Story",
          text: `${headline} • Day ${dayNumber} of ${arcLength} #winterarc`,
        });
        setFeedback({ message: "Shared to Instagram Story!", type: "success" });
        return;
      }

      // 2. Fallback: Download file directly and copy to clipboard, then show Instagram instructions
      downloadFile(blob, fileName);
      await copyBlobToClipboard(blob);
      setShowModal(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // User cancelled share sheet
      }
      // Provide download fallback
      const blob = await getBlob();
      if (blob) {
        downloadFile(blob, `winter-arc-day-${dayNumber}.png`);
        setShowModal(true);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Download directly
  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await getBlob();
      if (blob) {
        downloadFile(blob, `winter-arc-day-${dayNumber}.png`);
        setFeedback({ message: "Downloaded 1080×1920 Story PNG!", type: "success" });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy image to clipboard
  const handleCopy = async () => {
    setIsGenerating(true);
    try {
      const blob = await getBlob();
      if (blob) {
        const ok = await copyBlobToClipboard(blob);
        if (ok) {
          setFeedback({ message: "Story image copied to clipboard!", type: "success" });
        } else {
          downloadFile(blob, `winter-arc-day-${dayNumber}.png`);
          setFeedback({ message: "Downloaded image (clipboard not supported by browser)", type: "info" });
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Render on changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const activeTheme = THEMES[theme];

  return (
    <div className="space-y-8">
      {/* Hidden high-res canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Banner / Feedback */}
      {feedback && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-400">
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="ml-3 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Studio Grid: Controls (Left) and Phone Mockup Preview (Right) */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Column: Customization Controls (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* 1. Layout Preset Selector */}
          <div className="rounded-xl border border-line bg-card/60 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Story Template Layout</label>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { id: "streak", name: "🔥 Streak", desc: "Huge unbroken days" },
                  { id: "achievement", name: "🏆 Badge", desc: "Featured medal" },
                  { id: "metrics", name: "📊 4-Grid", desc: "Full metrics" },
                  { id: "manifesto", name: "⚡ Manifesto", desc: "Bold statement" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLayout(p.id)}
                  className={cn(
                    "flex flex-col items-center rounded-lg border p-3 text-center transition-all",
                    layout === p.id
                      ? "border-fg bg-fg text-bg font-semibold shadow-sm"
                      : "border-line bg-card/40 text-muted hover:border-fg/40 hover:text-fg",
                  )}
                >
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="mt-0.5 text-[10px] opacity-70">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Theme Selector */}
          <div className="rounded-xl border border-line bg-card/60 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Visual Theme</label>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(THEMES) as ThemeKey[]).map((tKey) => {
                const t = THEMES[tKey];
                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => setTheme(tKey)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs transition-all",
                      theme === tKey
                        ? "border-fg bg-fg text-bg font-semibold shadow-sm"
                        : "border-line bg-card/40 text-muted hover:border-fg/40 hover:text-fg",
                    )}
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-black/20"
                      style={{ backgroundColor: t.canvasAccent }}
                    />
                    <span>{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Headline Editor & Quick Chips */}
          <div className="rounded-xl border border-line bg-card/60 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Headline Title</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={40}
              placeholder="e.g. DAY 24 // LOCKED IN"
              className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-fg"
            />
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {HEADLINE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setHeadline(`DAY ${dayNumber} // ${preset}`)}
                  className="rounded-md border border-line/60 bg-card/40 px-2.5 py-1 text-[11px] text-muted hover:border-fg/40 hover:text-fg"
                >
                  +{preset}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Statement & Note */}
          <div className="rounded-xl border border-line bg-card/60 p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">Personal Statement / Quote</label>
              <textarea
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                rows={2}
                maxLength={140}
                placeholder="Silence. Focus. Execution."
                className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-fg"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">Today&apos;s Reflection / Note</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={100}
                placeholder="6 habits locked in before 8 AM."
                className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-fg"
              />
            </div>
          </div>

          {/* 5. Metrics Adjuster */}
          <div className="rounded-xl border border-line bg-card/60 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Display Metrics</label>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div>
                <span className="text-[11px] text-muted">Day Number</span>
                <input
                  type="number"
                  min={1}
                  max={arcLength}
                  value={dayNumber}
                  onChange={(e) => setDayNumber(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-line bg-bg px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted">Arc Days</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={arcLength}
                  onChange={(e) => setArcLength(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-line bg-bg px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted">Streak Days</span>
                <input
                  type="number"
                  min={0}
                  value={streak}
                  onChange={(e) => setStreak(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-line bg-bg px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted">Total XP</span>
                <input
                  type="number"
                  min={0}
                  value={xp}
                  onChange={(e) => setXp(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-line bg-bg px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted">Discipline %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={consistency}
                  onChange={(e) => setConsistency(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-line bg-bg px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
            </div>

          </div>

          {/* 6. Feature Badge (when Achievement or general) */}
          <div className="rounded-xl border border-line bg-card/60 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Spotlight Badge</label>
            <select
              value={selectedBadgeKey ?? ""}
              onChange={(e) => setSelectedBadgeKey(e.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-fg"
            >
              {data.badges.map((b) => (
                <option key={b.key} value={b.key}>
                  🏆 {b.name} (+{b.xpReward} XP) — {b.description}
                </option>
              ))}
            </select>
          </div>

          {/* 7. Display Toggles */}
          <div className="rounded-xl border border-line bg-card/60 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Visible Elements</label>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showStreak}
                  onChange={(e) => setShowStreak(e.target.checked)}
                  className="accent-fg"
                />
                <span>Active Streak</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showDay}
                  onChange={(e) => setShowDay(e.target.checked)}
                  className="accent-fg"
                />
                <span>Day Progress</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showXp}
                  onChange={(e) => setShowXp(e.target.checked)}
                  className="accent-fg"
                />
                <span>XP Counter</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showConsistency}
                  onChange={(e) => setShowConsistency(e.target.checked)}
                  className="accent-fg"
                />
                <span>Discipline Rate</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showBadge}
                  onChange={(e) => setShowBadge(e.target.checked)}
                  className="accent-fg"
                />
                <span>Featured Badge</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showWatermark}
                  onChange={(e) => setShowWatermark(e.target.checked)}
                  className="accent-fg"
                />
                <span>Watermark Handle</span>
              </label>
            </div>
          </div>

        </div>

        {/* Right Column: Live 9:16 Instagram Story Preview & Action Bar (5 cols) */}
        <div className="space-y-4 lg:col-span-5 lg:sticky lg:top-8">
          {/* Action Bar */}
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-card/80 p-3 shadow-md backdrop-blur">
            <button
              type="button"
              onClick={handleShareStory}
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              <InstagramIcon size={18} />
              <span>{isGenerating ? "Preparing Story..." : "Share on Instagram Story"}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-line bg-card/50 px-3 py-2 text-xs font-medium text-fg hover:border-fg transition-colors disabled:opacity-50"
              >
                <DownloadIcon size={14} />
                <span>Download PNG</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={isGenerating}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-line bg-card/50 px-3 py-2 text-xs font-medium text-fg hover:border-fg transition-colors disabled:opacity-50"
              >
                <CopyIcon size={14} />
                <span>Copy Image</span>
              </button>
            </div>
          </div>

          {/* 9:16 Phone Frame Mockup Preview */}
          <div className="flex justify-center">
            <div
              className={cn(
                "relative aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-[32px] border-[5px] border-[#22242a] bg-gradient-to-b p-5 shadow-2xl transition-all",
                activeTheme.bgClass,
                activeTheme.glowClass,
              )}
            >
              {/* Phone Speaker / Notch */}
              <div className="mx-auto mb-4 h-3.5 w-24 rounded-full bg-black/60" />

              {/* Story Content Inside Mockup */}
              <div className="flex h-[calc(100%-28px)] flex-col justify-between text-white">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[10px] tracking-widest uppercase">
                  <span className={cn("font-bold", activeTheme.accentColor)}>ARC // PROTOCOL</span>
                  <span className="text-white/60">
                    {data.user.username ? `@${data.user.username}` : "WINTER ARC"}
                  </span>
                </div>

                {/* Hero Section */}
                <div className="my-auto space-y-4 py-2 text-center">
                  {layout === "streak" && (
                    <div className="space-y-1">
                      <div
                        className={cn(
                          "mx-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-widest",
                          activeTheme.accentBg,
                        )}
                      >
                        <FlameIcon size={12} />
                        <span>UNBROKEN STREAK</span>
                      </div>
                      <div className="text-6xl font-black tracking-tight">{streak}</div>
                      <div className={cn("text-[11px] font-bold tracking-wider uppercase", activeTheme.accentColor)}>
                        Days Consistent
                      </div>
                    </div>
                  )}

                  {layout === "achievement" && (
                    <div className="space-y-2">
                      <div
                        className={cn(
                          "mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2",
                          activeTheme.accentBg,
                        )}
                      >
                        <TrophyIcon size={28} />
                      </div>
                      <div className="text-sm font-bold tracking-wide uppercase">{currentBadge.name}</div>
                      <div className={cn("text-[11px] font-semibold", activeTheme.accentColor)}>
                        +{currentBadge.xpReward} XP UNLOCKED
                      </div>
                    </div>
                  )}

                  {layout === "metrics" && (
                    <div className="grid grid-cols-2 gap-2 text-left">
                      <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                        <div className="text-[9px] text-white/50 tracking-wider">DAY</div>
                        <div className="text-sm font-bold">{dayNumber}/{arcLength}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                        <div className="text-[9px] text-white/50 tracking-wider">STREAK</div>
                        <div className="text-sm font-bold">{streak} Days</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                        <div className="text-[9px] text-white/50 tracking-wider">XP</div>
                        <div className="text-sm font-bold">{xp.toLocaleString()}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                        <div className="text-[9px] text-white/50 tracking-wider">RATE</div>
                        <div className="text-sm font-bold">{consistency}%</div>
                      </div>
                    </div>
                  )}

                  {layout === "manifesto" && (
                    <div className="space-y-1.5 py-2">
                      <div className={cn("text-3xl font-serif opacity-30", activeTheme.accentColor)}>“</div>
                      <div className="text-sm font-bold uppercase tracking-wide leading-snug">
                        {quote}
                      </div>
                      <div className={cn("text-[9px] font-bold tracking-widest", activeTheme.accentColor)}>
                        — WINTER ARC MANIFESTO
                      </div>
                    </div>
                  )}

                  {/* Headline */}
                  <div className="px-2">
                    <h2 className="text-base font-black tracking-wide uppercase leading-tight line-clamp-2">
                      {headline}
                    </h2>
                  </div>

                  {/* Statement Card */}
                  <div className="rounded-xl border border-white/10 bg-black/40 p-2.5 text-left text-[11px] leading-relaxed">
                    <div className={cn("text-[9px] font-bold tracking-wider uppercase mb-1", activeTheme.accentColor)}>
                      Discipline Log
                    </div>
                    <div className="italic text-white/90 line-clamp-2">&ldquo;{quote}&rdquo;</div>
                    {note && <div className="mt-1 text-[10px] text-white/60 line-clamp-1">{note}</div>}
                  </div>
                </div>

                {/* Footer Progress & Watermark */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex justify-between text-[10px] text-white/60">
                    <span>Day {dayNumber} of {arcLength}</span>
                    <span>{Math.round((dayNumber / arcLength) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-current transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(5, (dayNumber / arcLength) * 100))}%`,
                        color: activeTheme.canvasAccent,
                      }}
                    />
                  </div>
                  {showWatermark && (
                    <div className="text-center text-[8px] tracking-widest text-white/40 uppercase">
                      BUILT ON ARC PROTOCOL
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share to Instagram Story Modal (Desktop / Fallback) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white">
                <InstagramIcon size={22} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-fg">Ready for Instagram Story</h3>
                <p className="text-xs text-muted">1080×1920 HD Story Image saved</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-xl border border-line/60 bg-bg p-3.5 text-xs text-muted">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fg text-[11px] font-bold text-bg">
                  1
                </span>
                <p>
                  <strong>Downloaded:</strong> Image was saved to your downloads and copied to your clipboard.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fg text-[11px] font-bold text-bg">
                  2
                </span>
                <p>
                  <strong>Open Instagram:</strong> On mobile, swipe right to create a new Story and pick the downloaded image from your gallery.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fg text-[11px] font-bold text-bg">
                  3
                </span>
                <p>
                  <strong>Tag & Share:</strong> Add your music or stickers and share with your followers!
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-fg px-4 py-2.5 text-xs font-semibold text-bg transition hover:opacity-90"
              >
                <span>Open Instagram</span>
              </a>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-line px-4 py-2.5 text-xs text-muted hover:text-fg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill = true,
  stroke = true,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4,
) {
  const words = text.split(" ");
  let line = "";
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y);
      line = words[n] + " ";
      y += lineHeight;
      lineCount++;
      if (lineCount >= maxLines - 1 && n < words.length - 1) {
        line = line + words.slice(n + 1).join(" ");
        if (ctx.measureText(line).width > maxWidth) {
          line = line.slice(0, 20) + "...";
        }
        break;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y);
}

function downloadFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof ClipboardItem !== "undefined") {
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {
    // Clipboard item writing not supported or permissions denied
  }
  return false;
}
