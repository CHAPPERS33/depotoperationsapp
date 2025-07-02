
import { CageLabelData } from '../types';

export const printHtmlStringToNewWindow = (htmlContent: string, title: string = 'Print Document'): void => {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  
  if (printWindow) {
    printWindow.onload = () => {
      // The script inside the HTML might already trigger print.
      // For more control, can call printWindow.print();
      // URL.revokeObjectURL(url); // Clean up (tricky to time perfectly for all browsers)
    };
  } else {
    alert("Popup blocked! Please allow popups for this site to print. Alternatively, the HTML file will download.");
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};


export const generateCageLabelPrintHtml = (labelsData: CageLabelData[]): string => {
  const labelsHtml = labelsData.map(label => `
    <div class="label">
      <div class="drop-number">${label.dropNumber}</div>
      <div class="sub-depot-name">${label.subDepotName}</div>
      <div class="round-number">${label.roundId}</div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cage Labels</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .label-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-template-rows: repeat(3, 1fr); 
          gap: 5mm;
          width: calc(210mm - 20mm); /* A4 width - margins */
          height: calc(297mm - 20mm); /* A4 height - margins */
          page-break-inside: avoid; /* Try to keep container on one page */
        }
        .label {
          border: 1.5px solid black; /* Slightly thicker border */
          padding: 5mm; /* Inner padding for the content */
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: space-around; /* Distribute space */
          align-items: center;
          box-sizing: border-box;
          overflow: hidden;
          height: calc((297mm - 20mm - (2 * 5mm)) / 3); /* (PageHeight - PageMargins - Gaps) / Rows */
          background-color: white !important; /* Ensure white background for print */
        }
        .drop-number {
          font-size: 80pt; /* Adjusted for visibility */
          font-weight: bold;
          line-height: 1;
          color: black !important;
        }
        .sub-depot-name {
          font-size: 18pt;
          line-height: 1.2;
          margin-top: 2mm;
          color: black !important;
        }
        .round-number {
          font-size: 40pt; /* Adjusted for visibility */
          font-weight: bold;
          line-height: 1;
          margin-top: 2mm;
          color: black !important;
        }
        .no-print { display: none; }

        /* Helper for multiple pages if needed */
        .page-break { 
            page-break-before: always; 
            height: 0;
            display: block;
        }
      </style>
    </head>
    <body>
      <div class="label-container">
        ${labelsHtml}
      </div>
      <script class="no-print">
        window.onload = function() {
          setTimeout(function() {
            window.print();
            // window.close(); // Optionally close after print dialog
          }, 500); // Small delay for content rendering
        }
      </script>
    </body>
    </html>
  `;
};
