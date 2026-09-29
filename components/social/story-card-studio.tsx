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
    subtitle: string;
    dotColor: string;
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
    subtitle: "Graphite & Gold",
    dotColor: "#F59E0B",
    bgClass: "from-[#090b0e] via-[#11141c] to-[#07080b]",
    accentColor: "text-amber-400",
    accentBg: "bg-amber-400/10 text-amber-400 border-amber-400/30",
    borderClass: "border-amber-400/20",
    glowClass: "shadow-[0_0_50px_rgba(245,158,11,0.15)]",
    canvasBgStart: "#090b0e",
    canvasBgMid: "#121622",
    canvasBgEnd: "#07080b",
    canvasAccent: "#F59E0B",
    canvasAccentMuted: "#785312",
    canvasText: "#FFFFFF",
    canvasTextMuted: "#8E95A5",
  },
  frost: {
    name: "Frost Arc",
    subtitle: "Midnight & Cyan",
    dotColor: "#38BDF8",
    bgClass: "from-[#040914] via-[#09142a] to-[#03060f]",
    accentColor: "text-cyan-400",
    accentBg: "bg-cyan-400/10 text-cyan-400 border-cyan-400/30",
    borderClass: "border-cyan-400/20",
    glowClass: "shadow-[0_0_50px_rgba(56,189,248,0.18)]",
    canvasBgStart: "#040914",
    canvasBgMid: "#0B1836",
    canvasBgEnd: "#03060f",
    canvasAccent: "#38BDF8",
    canvasAccentMuted: "#0C4A6E",
    canvasText: "#FFFFFF",
    canvasTextMuted: "#94A3B8",
  },
  brutalist: {
    name: "Brutalist",
    subtitle: "Carbon & White",
    dotColor: "#FFFFFF",
    bgClass: "from-[#000000] via-[#0c0c0c] to-[#000000]",
    accentColor: "text-white",
    accentBg: "bg-white/10 text-white border-white/40",
    borderClass: "border-white/30",
    glowClass: "shadow-[0_0_40px_rgba(255,255,255,0.1)]",
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
    subtitle: "Charcoal & Blood",
    dotColor: "#F43F5E",
    bgClass: "from-[#0c0507] via-[#1a0a10] to-[#070304]",
    accentColor: "text-rose-500",
    accentBg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    borderClass: "border-rose-500/20",
    glowClass: "shadow-[0_0_50px_rgba(244,63,94,0.16)]",
    canvasBgStart: "#0c0507",
    canvasBgMid: "#1C0B12",
    canvasBgEnd: "#070304",
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
  const [activeTab, setActiveTab] = useState<"style" | "content" | "metrics">("style");
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

  // Feedback states
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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

  // Show temporary toast message
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // ─── High-Resolution 1080×1920 Canvas Renderer ─────────────────────────────
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
    const radial = ctx.createRadialGradient(width / 2, 580, 40, width / 2, 580, 680);
    radial.addColorStop(0, t.canvasAccent + "20");
    radial.addColorStop(1, "transparent");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // 3. Subtle grid pattern
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    const gridSize = 64;
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

    // Outer architectural frame
    ctx.strokeStyle = t.canvasAccent + "28";
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, width - 120, height - 120);

    // Corner crosshairs
    const drawCross = (cx: number, cy: number) => {
      ctx.strokeStyle = t.canvasAccent + "66";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy);
      ctx.lineTo(cx + 12, cy);
      ctx.moveTo(cx, cy - 12);
      ctx.lineTo(cx, cy + 12);
      ctx.stroke();
    };
    drawCross(60, 60);
    drawCross(width - 60, 60);
    drawCross(60, height - 60);
    drawCross(width - 60, height - 60);

    // 4. Header: ARC // WINTER ARC
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = t.canvasAccent;
    ctx.letterSpacing = "6px";
    ctx.textAlign = "left";
    ctx.fillText("ARC // WINTER ARC", 100, 150);

    const userHandle = data.user.username ? `@${data.user.username}` : data.user.name ?? "WINTER ARCHITECT";
    ctx.font = "600 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = t.canvasTextMuted;
    ctx.letterSpacing = "2px";
    ctx.textAlign = "right";
    ctx.fillText(userHandle.toUpperCase(), width - 100, 150);

    // Header divider line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(100, 180);
    ctx.lineTo(width - 100, 180);
    ctx.stroke();

    // 5. Hero based on Layout Preset
    if (layout === "streak") {
      const pillY = 270;
      ctx.fillStyle = t.canvasAccent + "18";
      ctx.strokeStyle = t.canvasAccent + "55";
      ctx.lineWidth = 1.5;
      drawRoundRect(ctx, width / 2 - 180, pillY, 360, 56, 28, true, true);

      ctx.fillStyle = t.canvasAccent;
      ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.letterSpacing = "4px";
      ctx.textAlign = "center";
      ctx.fillText("🔥  UNBROKEN STREAK", width / 2, pillY + 36);

      // Streak number
      ctx.font = "900 210px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasText;
      ctx.letterSpacing = "-6px";
      ctx.fillText(String(streak), width / 2, 530);

      ctx.font = "bold 30px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasAccent;
      ctx.letterSpacing = "8px";
      ctx.fillText("DAYS OF DISCIPLINE", width / 2, 585);
    } else if (layout === "achievement") {
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

      // Trophy glyph
      ctx.font = "72px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🏆", width / 2, centerY + 26);

      ctx.font = "bold 44px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasText;
      ctx.letterSpacing = "3px";
      ctx.fillText(currentBadge.name.toUpperCase(), width / 2, centerY + 185);

      ctx.font = "600 24px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasAccent;
      ctx.letterSpacing = "2px";
      ctx.fillText(`+${currentBadge.xpReward} XP UNLOCKED`, width / 2, centerY + 230);
    } else if (layout === "metrics") {
      const gridY = 260;
      const cardW = 410;
      const cardH = 160;
      const gap = 30;
      const leftCol = 105;
      const rightCol = leftCol + cardW + gap;

      const cards = [
        { label: "CURRENT DAY", val: `DAY ${dayNumber}`, sub: `OF ${arcLength} TOTAL` },
        { label: "ACTIVE STREAK", val: `${streak} DAYS`, sub: `BEST: ${data.bestStreak}d` },
        { label: "TOTAL XP", val: `${xp.toLocaleString()}`, sub: "EXPERIENCE" },
        { label: "DISCIPLINE", val: `${consistency}%`, sub: "SUCCESS RATE" },
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
        ctx.fillText(c.label, x + 28, y + 42);

        ctx.font = "900 44px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = t.canvasText;
        ctx.letterSpacing = "-1px";
        ctx.fillText(c.val, x + 28, y + 100);

        ctx.font = "500 18px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = t.canvasTextMuted;
        ctx.letterSpacing = "1px";
        ctx.fillText(c.sub, x + 28, y + 132);
      });
    } else {
      // Manifesto Hero (NO duplicate text below!)
      const quoteY = 320;
      ctx.font = "900 130px Georgia, serif";
      ctx.fillStyle = t.canvasAccent + "38";
      ctx.textAlign = "left";
      ctx.fillText("“", 100, quoteY + 40);

      ctx.font = "italic 800 46px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasText;
      ctx.letterSpacing = "0.5px";
      wrapText(ctx, quote.toUpperCase(), 110, quoteY + 90, 860, 64, 4);

      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasAccent;
      ctx.letterSpacing = "5px";
      ctx.fillText("— WINTER ARC PROTOCOL", 110, quoteY + 310);
    }

    // 6. Center: Editable Headline
    const headlineY = layout === "metrics" ? 680 : layout === "manifesto" ? 720 : 680;
    ctx.textAlign = "center";
    ctx.font = "900 64px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = t.canvasText;
    ctx.letterSpacing = "2px";
    wrapText(ctx, headline.toUpperCase(), width / 2, headlineY, 900, 74, 2);

    // 7. Statement / Reflection Box (Only rendered if NOT manifesto to avoid duplicate text!)
    const boxY = headlineY + 115;
    const boxH = 220;
    if (layout !== "manifesto") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.strokeStyle = t.canvasAccent + "33";
      ctx.lineWidth = 1.5;
      drawRoundRect(ctx, 100, boxY, width - 200, boxH, 22, true, true);

      // Accent border stripe on left
      ctx.fillStyle = t.canvasAccent;
      drawRoundRect(ctx, 100, boxY, 8, boxH, 4, true, false);

      ctx.textAlign = "left";
      ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasAccent;
      ctx.letterSpacing = "3px";
      ctx.fillText("DAILY LOG // MANIFESTO", 136, boxY + 44);

      ctx.font = "400 28px -apple-system, BlinkMacSystemFont, Georgia, sans-serif";
      ctx.fillStyle = "#E2E8F0";
      wrapText(ctx, `"${quote}"`, 136, boxY + 98, 800, 40, 2);

      if (note) {
        ctx.font = "400 22px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = t.canvasTextMuted;
        wrapText(ctx, note, 136, boxY + 172, 800, 32, 1);
      }
    } else if (note) {
      // For Manifesto layout, render clean note line without the box
      ctx.textAlign = "center";
      ctx.font = "400 26px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasTextMuted;
      wrapText(ctx, note, width / 2, boxY + 40, 860, 36, 2);
    }

    // 8. Stats Strip (Bottom quadrant)
    const stripY = boxY + boxH + 50;
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
        ctx.font = "600 18px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = t.canvasTextMuted;
        ctx.letterSpacing = "2px";
        ctx.fillText(st.label, cx, stripY + 20);

        ctx.font = "bold 40px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = t.canvasText;
        ctx.letterSpacing = "0px";
        ctx.fillText(st.value, cx, stripY + 68);

        if (idx < statItems.length - 1) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.beginPath();
          ctx.moveTo(100 + colWidth * (idx + 1), stripY + 10);
          ctx.lineTo(100 + colWidth * (idx + 1), stripY + 75);
          ctx.stroke();
        }
      });
    }

    // 9. Arc Progress Bar
    const barY = stripY + 125;
    const barW = width - 200;
    const progress = Math.min(1, Math.max(0, dayNumber / arcLength));

    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    drawRoundRect(ctx, 100, barY, barW, 14, 7, true, false);

    if (progress > 0) {
      const barGrad = ctx.createLinearGradient(100, 0, 100 + barW * progress, 0);
      barGrad.addColorStop(0, t.canvasAccentMuted);
      barGrad.addColorStop(1, t.canvasAccent);
      ctx.fillStyle = barGrad;
      drawRoundRect(ctx, 100, barY, Math.max(20, barW * progress), 14, 7, true, false);
    }

    ctx.textAlign = "left";
    ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = t.canvasTextMuted;
    ctx.letterSpacing = "2px";
    ctx.fillText(`PROGRESS: ${Math.round(progress * 100)}% COMPLETE`, 100, barY + 40);

    ctx.textAlign = "right";
    ctx.fillText(`${arcLength - dayNumber} DAYS REMAINING`, width - 100, barY + 40);

    // 10. Footer / Watermark (Safe Area)
    if (showWatermark) {
      const footerY = height - 125;
      ctx.textAlign = "center";
      ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasAccent;
      ctx.letterSpacing = "6px";
      ctx.fillText("BUILT ON ARC PROTOCOL", width / 2, footerY);

      ctx.font = "500 16px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = t.canvasTextMuted;
      ctx.letterSpacing = "3px";
      ctx.fillText("DISCIPLINE • EXECUTION • ZERO COMPROMISE", width / 2, footerY + 30);
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

  // Share to Instagram Story handler
  const handleShareStory = async () => {
    setIsGenerating(true);
    try {
      const blob = await getBlob();
      if (!blob) throw new Error("Could not render image");

      const fileName = `winter-arc-day-${dayNumber}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Winter Arc Story",
          text: `${headline} • Day ${dayNumber} of ${arcLength} #winterarc`,
        });
        showToast("Shared to Instagram Story!");
        return;
      }

      downloadFile(blob, fileName);
      await copyBlobToClipboard(blob);
      setShowModal(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      const blob = await getBlob();
      if (blob) {
        downloadFile(blob, `winter-arc-day-${dayNumber}.png`);
        setShowModal(true);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await getBlob();
      if (blob) {
        downloadFile(blob, `winter-arc-day-${dayNumber}.png`);
        showToast("Downloaded 1080×1920 Story PNG!");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    setIsGenerating(true);
    try {
      const blob = await getBlob();
      if (blob) {
        const ok = await copyBlobToClipboard(blob);
        if (ok) {
          showToast("Image copied to clipboard!");
        } else {
          downloadFile(blob, `winter-arc-day-${dayNumber}.png`);
          showToast("Downloaded image (clipboard not supported)");
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const activeTheme = THEMES[theme];

  return (
    <div className="space-y-6">
      {/* Hidden offscreen canvas for 1080×1920 generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-zinc-950/90 px-4 py-3 text-xs font-medium text-emerald-400 shadow-2xl backdrop-blur-md animate-fade">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Studio View: Left Controls & Right Mockup */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* ─── Left Column: Sleek Studio Editor (7 cols) ─── */}
        <div className="space-y-5 lg:col-span-7">
          {/* Segmented Category Navigation */}
          <div className="flex rounded-xl border border-line bg-card/40 p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("style")}
              className={cn(
                "flex-1 rounded-lg py-2 font-medium transition-all",
                activeTab === "style" ? "bg-fg text-bg shadow-sm" : "text-muted hover:text-fg",
              )}
            >
              1. Style & Theme
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("content")}
              className={cn(
                "flex-1 rounded-lg py-2 font-medium transition-all",
                activeTab === "content" ? "bg-fg text-bg shadow-sm" : "text-muted hover:text-fg",
              )}
            >
              2. Words & Quote
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("metrics")}
              className={cn(
                "flex-1 rounded-lg py-2 font-medium transition-all",
                activeTab === "metrics" ? "bg-fg text-bg shadow-sm" : "text-muted hover:text-fg",
              )}
            >
              3. Stats & Toggles
            </button>
          </div>

          {/* TAB 1: Style & Theme */}
          {activeTab === "style" && (
            <div className="space-y-5 animate-fade">
              {/* Layout Preset Selector */}
              <div className="rounded-2xl border border-line bg-card/50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Story Template Layout</span>
                  <span className="text-[11px] text-muted">9:16 Vertical Composition</span>
                </div>
                <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      { id: "streak", icon: "🔥", name: "Streak", desc: "Unbroken days" },
                      { id: "achievement", icon: "🏆", name: "Badge", desc: "Medal unlock" },
                      { id: "metrics", icon: "📊", name: "4-Grid", desc: "Full metrics" },
                      { id: "manifesto", icon: "⚡", name: "Manifesto", desc: "Mantra quote" },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setLayout(p.id)}
                      className={cn(
                        "group relative flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition-all",
                        layout === p.id
                          ? "border-fg bg-fg text-bg shadow-md scale-[1.02]"
                          : "border-line bg-card/60 text-muted hover:border-fg/40 hover:text-fg hover:bg-card",
                      )}
                    >
                      <span className="text-xl">{p.icon}</span>
                      <span className="mt-1 text-xs font-bold">{p.name}</span>
                      <span className="text-[10px] opacity-75">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Selector */}
              <div className="rounded-2xl border border-line bg-card/50 p-5 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Color & Mood Theme</span>
                <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(Object.keys(THEMES) as ThemeKey[]).map((tKey) => {
                    const t = THEMES[tKey];
                    const isSelected = theme === tKey;
                    return (
                      <button
                        key={tKey}
                        type="button"
                        onClick={() => setTheme(tKey)}
                        className={cn(
                          "flex flex-col items-start rounded-xl border p-3 text-left transition-all",
                          isSelected
                            ? "border-fg bg-card ring-2 ring-fg/20 shadow-md"
                            : "border-line bg-card/40 hover:border-fg/30 hover:bg-card",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3.5 w-3.5 rounded-full shadow-sm"
                            style={{ backgroundColor: t.dotColor }}
                          />
                          <span className="text-xs font-bold text-fg">{t.name}</span>
                        </div>
                        <span className="mt-1 text-[10px] text-muted">{t.subtitle}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Words & Quote */}
          {activeTab === "content" && (
            <div className="space-y-5 animate-fade">
              {/* Headline Title */}
              <div className="rounded-2xl border border-line bg-card/50 p-5 shadow-sm space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Headline Text
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  maxLength={40}
                  placeholder="e.g. DAY 2 // LOCKED IN"
                  className="w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm font-medium text-fg outline-none focus:border-fg transition-colors"
                />
                <div>
                  <span className="text-[11px] text-muted">Quick Presets:</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {HEADLINE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setHeadline(`DAY ${dayNumber} // ${preset}`)}
                        className="rounded-lg border border-line/60 bg-card/40 px-2.5 py-1 text-[11px] text-muted hover:border-fg/40 hover:text-fg transition-colors"
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Personal Statement / Mantra */}
              <div className="rounded-2xl border border-line bg-card/50 p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Personal Statement / Quote
                  </label>
                  <span className="text-[10px] text-muted">{quote.length}/140</span>
                </div>
                <textarea
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  rows={2}
                  maxLength={140}
                  placeholder="Silence. Focus. Execution."
                  className="w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm text-fg outline-none focus:border-fg transition-colors"
                />
              </div>

              {/* Daily Reflection / Note */}
              <div className="rounded-2xl border border-line bg-card/50 p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Today&apos;s Daily Reflection / Note
                  </label>
                  <span className="text-[10px] text-muted">{note.length}/100</span>
                </div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={100}
                  placeholder="Showing up every single day. Consistency is the only hack."
                  className="w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm text-fg outline-none focus:border-fg transition-colors"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Stats & Toggles */}
          {activeTab === "metrics" && (
            <div className="space-y-5 animate-fade">
              {/* Display Metrics Adjuster */}
              <div className="rounded-2xl border border-line bg-card/50 p-5 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Metric Values</span>
                <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div className="rounded-xl border border-line/60 bg-bg p-2.5">
                    <span className="text-[10px] uppercase font-bold text-muted">Day</span>
                    <input
                      type="number"
                      min={1}
                      max={arcLength}
                      value={dayNumber}
                      onChange={(e) => setDayNumber(Number(e.target.value))}
                      className="mt-1 w-full bg-transparent text-sm font-bold text-fg outline-none"
                    />
                  </div>
                  <div className="rounded-xl border border-line/60 bg-bg p-2.5">
                    <span className="text-[10px] uppercase font-bold text-muted">Arc Days</span>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={arcLength}
                      onChange={(e) => setArcLength(Number(e.target.value))}
                      className="mt-1 w-full bg-transparent text-sm font-bold text-fg outline-none"
                    />
                  </div>
                  <div className="rounded-xl border border-line/60 bg-bg p-2.5">
                    <span className="text-[10px] uppercase font-bold text-muted">Streak 🔥</span>
                    <input
                      type="number"
                      min={0}
                      value={streak}
                      onChange={(e) => setStreak(Number(e.target.value))}
                      className="mt-1 w-full bg-transparent text-sm font-bold text-fg outline-none"
                    />
                  </div>
                  <div className="rounded-xl border border-line/60 bg-bg p-2.5">
                    <span className="text-[10px] uppercase font-bold text-muted">Total XP</span>
                    <input
                      type="number"
                      min={0}
                      value={xp}
                      onChange={(e) => setXp(Number(e.target.value))}
                      className="mt-1 w-full bg-transparent text-sm font-bold text-fg outline-none"
                    />
                  </div>
                  <div className="rounded-xl border border-line/60 bg-bg p-2.5">
                    <span className="text-[10px] uppercase font-bold text-muted">Discipline %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={consistency}
                      onChange={(e) => setConsistency(Number(e.target.value))}
                      className="mt-1 w-full bg-transparent text-sm font-bold text-fg outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Spotlight Badge */}
              <div className="rounded-2xl border border-line bg-card/50 p-5 shadow-sm space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Featured Achievement Badge
                </label>
                <select
                  value={selectedBadgeKey ?? ""}
                  onChange={(e) => setSelectedBadgeKey(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-xs text-fg outline-none focus:border-fg transition-colors"
                >
                  {data.badges.map((b) => (
                    <option key={b.key} value={b.key}>
                      🏆 {b.name} (+{b.xpReward} XP) — {b.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visibility Checkboxes */}
              <div className="rounded-2xl border border-line bg-card/50 p-5 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Card Elements</span>
                <div className="mt-3.5 grid grid-cols-2 gap-2.5 text-xs sm:grid-cols-3">
                  {[
                    { label: "Active Streak", val: showStreak, set: setShowStreak },
                    { label: "Day Progress", val: showDay, set: setShowDay },
                    { label: "XP Counter", val: showXp, set: setShowXp },
                    { label: "Discipline Rate", val: showConsistency, set: setShowConsistency },
                    { label: "Featured Badge", val: showBadge, set: setShowBadge },
                    { label: "Watermark Handle", val: showWatermark, set: setShowWatermark },
                  ].map((item, idx) => (
                    <label
                      key={idx}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition-all select-none",
                        item.val
                          ? "border-fg/40 bg-fg/5 text-fg font-medium"
                          : "border-line bg-card/30 text-muted hover:border-line/80",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={item.val}
                        onChange={(e) => item.set(e.target.checked)}
                        className="accent-fg rounded"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Right Column: Smartphone Mockup & Action Bar (5 cols) ─── */}
        <div className="space-y-5 lg:col-span-5 lg:sticky lg:top-8 flex flex-col items-center">
          {/* Action Bar */}
          <div className="w-full max-w-[320px] space-y-2 rounded-2xl border border-line bg-card/90 p-3.5 shadow-xl backdrop-blur-md">
            <button
              type="button"
              onClick={handleShareStory}
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-transform active:scale-[0.98] hover:opacity-95 disabled:opacity-50"
            >
              <InstagramIcon size={18} />
              <span>{isGenerating ? "Preparing Story..." : "Share on Instagram Story"}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-bg px-3 py-2 text-xs font-medium text-fg hover:border-fg transition-colors disabled:opacity-50"
              >
                <DownloadIcon size={14} />
                <span>Download PNG</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={isGenerating}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-bg px-3 py-2 text-xs font-medium text-fg hover:border-fg transition-colors disabled:opacity-50"
              >
                <CopyIcon size={14} />
                <span>Copy Image</span>
              </button>
            </div>
          </div>

          {/* 9:16 Phone Frame Mockup Preview */}
          <div className="relative w-full max-w-[310px]">
            {/* Phone Outer Chassis with Titanium Bezel */}
            <div
              className={cn(
                "relative aspect-[9/16] w-full overflow-hidden rounded-[42px] border-[7px] border-[#1f2229] bg-gradient-to-b p-5 shadow-2xl transition-all",
                activeTheme.bgClass,
                activeTheme.glowClass,
              )}
            >
              {/* Dynamic Island / Pill Notch */}
              <div className="mx-auto mb-3.5 h-4 w-24 rounded-full bg-black/80 border border-white/5 flex items-center justify-end px-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
              </div>

              {/* Story Canvas Content Container */}
              <div className="flex h-[calc(100%-28px)] flex-col justify-between text-white select-none">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5 text-[9px] tracking-widest uppercase">
                  <span className={cn("font-bold", activeTheme.accentColor)}>ARC // WINTER ARC</span>
                  <span className="text-white/60 font-medium">
                    {data.user.username ? `@${data.user.username}` : "WINTER ARCHITECT"}
                  </span>
                </div>

                {/* Hero Middle Section */}
                <div className="my-auto space-y-3.5 py-1 text-center">
                  {layout === "streak" && (
                    <div className="space-y-1">
                      <div
                        className={cn(
                          "mx-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-bold tracking-widest",
                          activeTheme.accentBg,
                        )}
                      >
                        <FlameIcon size={11} />
                        <span>UNBROKEN STREAK</span>
                      </div>
                      <div className="text-6xl font-black tracking-tighter leading-none">{streak}</div>
                      <div className={cn("text-[10px] font-bold tracking-widest uppercase", activeTheme.accentColor)}>
                        Days Consistent
                      </div>
                    </div>
                  )}

                  {layout === "achievement" && (
                    <div className="space-y-2">
                      <div
                        className={cn(
                          "mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2",
                          activeTheme.accentBg,
                        )}
                      >
                        <TrophyIcon size={24} />
                      </div>
                      <div className="text-xs font-bold tracking-wider uppercase">{currentBadge.name}</div>
                      <div className={cn("text-[10px] font-semibold tracking-wider", activeTheme.accentColor)}>
                        +{currentBadge.xpReward} XP UNLOCKED
                      </div>
                    </div>
                  )}

                  {layout === "metrics" && (
                    <div className="grid grid-cols-2 gap-2 text-left">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                        <div className="text-[8px] text-white/50 tracking-wider font-bold">DAY</div>
                        <div className="text-xs font-bold">{dayNumber}/{arcLength}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                        <div className="text-[8px] text-white/50 tracking-wider font-bold">STREAK</div>
                        <div className="text-xs font-bold">{streak} Days</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                        <div className="text-[8px] text-white/50 tracking-wider font-bold">XP</div>
                        <div className="text-xs font-bold">{xp.toLocaleString()}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                        <div className="text-[8px] text-white/50 tracking-wider font-bold">RATE</div>
                        <div className="text-xs font-bold">{consistency}%</div>
                      </div>
                    </div>
                  )}

                  {layout === "manifesto" && (
                    <div className="space-y-1.5 py-1">
                      <div className={cn("text-3xl font-serif opacity-30 leading-none", activeTheme.accentColor)}>“</div>
                      <div className="text-xs font-bold uppercase tracking-wide leading-snug px-2 line-clamp-3">
                        {quote}
                      </div>
                      <div className={cn("text-[8px] font-bold tracking-widest", activeTheme.accentColor)}>
                        — WINTER ARC MANIFESTO
                      </div>
                    </div>
                  )}

                  {/* Headline Title */}
                  <div className="px-1">
                    <h2 className="text-sm font-black tracking-wide uppercase leading-tight line-clamp-2">
                      {headline}
                    </h2>
                  </div>

                  {/* Statement Card (Shown when NOT manifesto to prevent text repetition!) */}
                  {layout !== "manifesto" && (
                    <div className="rounded-xl border border-white/10 bg-black/40 p-2 text-left text-[10px] leading-relaxed">
                      <div className={cn("text-[8px] font-bold tracking-wider uppercase mb-0.5", activeTheme.accentColor)}>
                        Discipline Statement
                      </div>
                      <div className="italic text-white/90 line-clamp-2">&ldquo;{quote}&rdquo;</div>
                      {note && <div className="mt-1 text-[9px] text-white/60 line-clamp-1">{note}</div>}
                    </div>
                  )}
                </div>

                {/* Footer Progress & Watermark */}
                <div className="space-y-2 border-t border-white/10 pt-2">
                  <div className="flex justify-between text-[9px] text-white/60 font-medium">
                    <span>Day {dayNumber} of {arcLength}</span>
                    <span>{Math.round((dayNumber / arcLength) * 100)}%</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(5, (dayNumber / arcLength) * 100))}%`,
                        backgroundColor: activeTheme.canvasAccent,
                      }}
                    />
                  </div>
                  {showWatermark && (
                    <div className="text-center text-[7.5px] tracking-widest text-white/40 uppercase font-semibold">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white shadow-md">
                <InstagramIcon size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-fg">Ready for Instagram Story</h3>
                <p className="text-xs text-muted">1080×1920 HD Story image saved</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-xl border border-line/60 bg-bg p-4 text-xs text-muted">
              <div className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fg text-[11px] font-bold text-bg">
                  1
                </span>
                <p>
                  <strong>Saved:</strong> The image was downloaded to your device and copied to your clipboard.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fg text-[11px] font-bold text-bg">
                  2
                </span>
                <p>
                  <strong>Open Instagram:</strong> Open Instagram on your phone, swipe right or tap &quot;+&quot; to create a Story.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fg text-[11px] font-bold text-bg">
                  3
                </span>
                <p>
                  <strong>Post:</strong> Select the image from your camera roll, add your music or stickers, and share!
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-fg px-4 py-2.5 text-xs font-semibold text-bg transition hover:opacity-90"
              >
                <span>Open Instagram</span>
              </a>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-line px-4 py-2.5 text-xs text-muted hover:text-fg"
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

// ─── Canvas Drawing Utilities ──────────────────────────────────────────────────

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
