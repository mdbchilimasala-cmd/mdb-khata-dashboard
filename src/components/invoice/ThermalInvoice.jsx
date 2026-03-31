import { Fragment, useCallback, useEffect, useMemo, useRef } from "react";
import { jsPDF } from "jspdf";
import { money } from "../../utils/billing";

/** Split a monospace line into plain text vs money tokens (en-IN style like 5,000.00). */
function splitLineAmountParts(line) {
  const AMOUNT_RE = /\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}/g;
  const parts = [];
  let last = 0;
  let m;
  while ((m = AMOUNT_RE.exec(line)) !== null) {
    if (m.index > last) parts.push({ kind: "text", s: line.slice(last, m.index) });
    parts.push({ kind: "amt", s: m[0] });
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push({ kind: "text", s: line.slice(last) });
  if (parts.length === 0) parts.push({ kind: "text", s: line });
  return parts;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function invoiceTextToPrintHtml(text) {
  return text
    .split("\n")
    .map((line) => {
      const inner = splitLineAmountParts(line)
        .map((p) =>
          p.kind === "amt"
            ? `<span class="amt">${escapeHtml(p.s)}</span>`
            : escapeHtml(p.s),
        )
        .join("");
      return `<div class="line">${inner}</div>`;
    })
    .join("");
}

export function ThermalInvoice({ invoice, printSignal = 0 }) {
  const ref = useRef(null);
  const rows = useMemo(() => invoice?.items || [], [invoice?.items]);

  const totals = useMemo(() => {
    const bags = rows.reduce((a, b) => a + Number(b.bags || 0), 0);
    const qty = rows.reduce((a, b) => a + Number(b.qtyNum || 0), 0);
    const total = rows.reduce((a, b) => a + Number(b.amount || 0), 0);
    return { bags, qty, total };
  }, [rows]);

  const grandTotal = Number(invoice?.total ?? totals.total);
  const paidAmount = Number(invoice?.paid || 0);
  const previousBalance = Number(invoice?.previousBalance ?? Number(invoice?.finalBalance || 0) - grandTotal + paidAmount);
  const finalBalance = Number(invoice?.finalBalance ?? previousBalance + grandTotal - paidAmount);
  const customerLabel = String(invoice?.customerName || "").trim() || "CUSTOMER";
  const displayInvoiceNo = String(invoice?.invoiceNo || "").replace(/^INV-/i, "");

  const SLIP_WIDTH = 62;
  const centerLine = (s) => {
    const t = String(s);
    if (t.length >= SLIP_WIDTH) return t.slice(0, SLIP_WIDTH);
    const pad = Math.floor((SLIP_WIDTH - t.length) / 2);
    return " ".repeat(pad) + t;
  };

  const txt = (v, w) => String(v ?? "").slice(0, w).padEnd(w, " ");
  const num = (v, w) => String(v ?? "").slice(0, w).padStart(w, " ");
  const hr = "-".repeat(SLIP_WIDTH);
  const eq = "=".repeat(SLIP_WIDTH);
  const renderedRows = rows
    .map((r) => `${txt(r.lotNo, 12)}${num(r.bags, 4)} ${num(r.qty, 9)} ${num(r.rate, 9)} ${num(money(r.amount || 0), 14)}`)
    .join("\n");
  const invoiceText = `${centerLine("Z")}
${centerLine("BILL")}
${customerLabel.padEnd(36)}No. ${displayInvoiceNo}
${"".padEnd(36)}Dt. ${invoice?.date || ""}${invoice?.time ? ` ${invoice.time}` : ""}
${hr}
Lot/Item      Bags       Qty      Rate         Amount
${renderedRows}
${hr}
Total         ${num(totals.bags, 4)} ${num(totals.qty.toFixed(2), 9)} ${"".padEnd(9)} ${num(money(totals.total), 14)}
Old Balance ...                          ${money(previousBalance)}
${hr}
Grand Total ...                            ${money(grandTotal)}
Final Bal ...                              ${money(finalBalance)}
${eq}`;

  const slipHtml = useMemo(() => invoiceTextToPrintHtml(invoiceText), [invoiceText]);

  const printInvoiceOnly = useCallback(() => {
    if (!ref.current) return;
    const win = window.open("", "_blank", "width=420,height=800");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Invoice ${displayInvoiceNo}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            html, body { width: 100%; height: 100%; margin: 0; background: #fff; }
            body { display: block; }
            .page {
              width: calc(210mm - 30mm);
              height: calc(297mm - 30mm);
              display: grid;
              grid-template-rows: calc((100% - 8mm) / 2) 8mm calc((100% - 8mm) / 2);
              box-sizing: border-box;
              margin: 0 auto;
            }
            .copy {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: flex-start;
              justify-content: center;
              overflow: hidden;
              min-width: 0;
            }
            .slip {
              width: 62ch;
              max-width: 100%;
              font-family: "Courier New", monospace;
              color: #000;
              font-weight: 600;
              margin: 0;
              display: block;
              flex-shrink: 0;
            }
            .divider {
              width: 100%;
              border-top: 1px dashed #111;
              align-self: center;
            }
            .line {
              margin: 0;
              width: 100%;
              text-align: left;
              color: #000;
              font-size: 3.4mm;
              line-height: 1.32;
              white-space: pre;
              display: block;
              font-weight: 700;
              font-family: "Courier New", monospace;
            }
            .line .amt {
              font-weight: 900;
              font-size: 1.18em;
              letter-spacing: 0.02em;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="copy"><div class="slip">${slipHtml}</div></div>
            <div class="divider"></div>
            <div class="copy"><div class="slip">${slipHtml}</div></div>
          </div>
          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  }, [displayInvoiceNo, slipHtml]);

  const drawPdfLineWithAmounts = (pdf, line, x, y, baseSize, amtSize) => {
    let xPos = x;
    splitLineAmountParts(line).forEach((p) => {
      const isAmt = p.kind === "amt";
      pdf.setFont("courier", "bold");
      pdf.setFontSize(isAmt ? amtSize : baseSize);
      pdf.text(p.s, xPos, y);
      xPos += pdf.getTextWidth(p.s);
    });
  };

  const buildInvoicePdfBlob = useCallback(() => {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const lines = String(invoiceText).split("\n");
    const marginLeft = 42;
    const topStart = 52;
    const bottomStart = 450;
    const lineHeight = 12;
    const dividerY = 410;
    const dividerEndX = 560;
    const baseSize = 10.5;
    const amtSize = 12.5;

    // Top copy
    lines.forEach((line, i) => {
      drawPdfLineWithAmounts(pdf, line, marginLeft, topStart + i * lineHeight, baseSize, amtSize);
    });

    // Divider line between copies (similar to print dashed separator)
    pdf.setLineDashPattern([4, 3], 0);
    pdf.line(marginLeft, dividerY, dividerEndX, dividerY);
    pdf.setLineDashPattern([], 0);

    // Bottom copy
    lines.forEach((line, i) => {
      drawPdfLineWithAmounts(pdf, line, marginLeft, bottomStart + i * lineHeight, baseSize, amtSize);
    });

    return pdf.output("blob");
  }, [invoiceText]);

  const shareInvoicePdf = useCallback(async () => {
    const blob = buildInvoicePdfBlob();
    const filename = `Invoice-${displayInvoiceNo || "invoice"}.pdf`;
    const file = new File([blob], filename, { type: "application/pdf" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: `Invoice ${displayInvoiceNo || ""}`.trim(),
          files: [file],
        });
        return;
      } catch {
        // User cancelled or share failed; fallback to download.
      }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [buildInvoicePdfBlob, displayInvoiceNo]);

  useEffect(() => {
    if (!printSignal || !invoice?.id) return;
    printInvoiceOnly();
  }, [printSignal, invoice?.id, printInvoiceOnly]);

  return (
    <div>
      <style>{`@media print { .invoice-actions { display: none !important; } }`}</style>
      <div
        ref={ref}
        className="mx-auto w-[62ch] max-w-full overflow-hidden rounded border border-black bg-white p-3 text-black sm:p-4"
        style={{ fontFamily: "Courier New, monospace" }}
      >
        <div
          className="text-[14px] font-bold leading-[1.32] text-black sm:text-[16px]"
          style={{ fontFamily: "Courier New, monospace" }}
        >
          {invoiceText.split("\n").map((line, i) => (
            <div key={i} className="whitespace-pre">
              {splitLineAmountParts(line).map((p, j) =>
                p.kind === "amt" ? (
                  <span
                    key={j}
                    className="font-black text-[1.08em] tracking-wide text-black sm:text-[1.14em]"
                  >
                    {p.s}
                  </span>
                ) : (
                  <Fragment key={j}>{p.s}</Fragment>
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="invoice-actions mt-3 flex flex-wrap gap-2">
        <button className="rounded bg-black px-3 py-2 text-white" onClick={printInvoiceOnly}>
          Print
        </button>
        <button className="rounded border px-3 py-2" onClick={shareInvoicePdf}>
          Share PDF
        </button>
      </div>
    </div>
  );
}
