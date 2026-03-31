import { useCallback, useEffect, useMemo, useRef } from "react";
import { jsPDF } from "jspdf";
import { money } from "../../utils/billing";

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

  const txt = (v, w) => String(v ?? "").slice(0, w).padEnd(w, " ");
  const num = (v, w) => String(v ?? "").slice(0, w).padStart(w, " ");
  const hr = "-".repeat(62);
  const eq = "=".repeat(62);
  const renderedRows = rows
    .map((r) => `${txt(r.lotNo, 12)}${num(r.bags, 4)} ${num(r.qty, 9)} ${num(r.rate, 9)} ${num(money(r.amount || 0), 14)}`)
    .join("\n");
  const invoiceText = `               M
            BILL
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
              justify-content: flex-start;
              overflow: hidden;
            }
            .slip {
              width: 100%;
              max-width: 100%;
              font-family: "Courier New", monospace;
              color: #000;
              margin: 0;
              display: block;
            }
            .divider {
              width: 100%;
              border-top: 1px dashed #111;
              align-self: center;
            }
            pre {
              margin: 0;
              width: 100%;
              font-size: 4.3mm;
              line-height: 1.32;
              white-space: pre;
              display: block;
              font-family: "Courier New", monospace;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="copy"><div class="slip"><pre>${invoiceText}</pre></div></div>
            <div class="divider"></div>
            <div class="copy"><div class="slip"><pre>${invoiceText}</pre></div></div>
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
  }, [displayInvoiceNo, invoiceText]);

  const buildInvoicePdfBlob = useCallback(() => {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    pdf.setFont("courier", "normal");
    pdf.setFontSize(10);
    const lines = String(invoiceText).split("\n");
    const marginLeft = 42;
    const topStart = 52;
    const bottomStart = 450;
    const lineHeight = 11.5;
    const dividerY = 410;
    const dividerEndX = 560;

    // Top copy
    lines.forEach((line, i) => {
      pdf.text(line, marginLeft, topStart + i * lineHeight);
    });

    // Divider line between copies (similar to print dashed separator)
    pdf.setLineDashPattern([4, 3], 0);
    pdf.line(marginLeft, dividerY, dividerEndX, dividerY);
    pdf.setLineDashPattern([], 0);

    // Bottom copy
    lines.forEach((line, i) => {
      pdf.text(line, marginLeft, bottomStart + i * lineHeight);
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
        className="w-[360px] max-w-full overflow-hidden rounded border border-slate-300 bg-white p-3 text-black sm:p-4"
        style={{ fontFamily: "Courier New, monospace" }}
      >
        <pre className="text-[14px] leading-5 sm:text-[16px] sm:leading-6">
{invoiceText}
        </pre>
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
