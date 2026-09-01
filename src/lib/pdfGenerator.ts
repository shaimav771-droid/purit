import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BusinessSettings, Customer, Sale, SaleItem } from '../types';
import { formatDate } from './dateUtils';

// Convert number to Indian Currency Words (e.g. Rupees Nineteen Thousand Four Hundred Seventy Only/-)
export function numberToWordsIndian(num: number): string {
  if (num === 0) return 'Rupees Zero Only/-';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 20) return a[n];
    const tens = b[Math.floor(n / 10)];
    const unit = a[n % 10];
    return unit ? `${tens} ${unit}` : tens;
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    let res = '';
    if (hundred > 0) {
      res += `${a[hundred]} Hundred`;
    }
    if (remainder > 0) {
      res += (res ? ' ' : '') + convertTwoDigits(remainder);
    }
    return res;
  }

  const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  let words = '';

  const crore = Math.floor(rupees / 10000000);
  let rem = rupees % 10000000;

  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;

  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  const hundredPart = rem;

  if (crore > 0) {
    words += `${convertTwoDigits(crore)} Crore `;
  }
  if (lakh > 0) {
    words += `${convertTwoDigits(lakh)} Lakh `;
  }
  if (thousand > 0) {
    words += `${convertTwoDigits(thousand)} Thousand `;
  }
  if (hundredPart > 0) {
    words += `${convertThreeDigits(hundredPart)} `;
  }

  words = words.trim();
  if (!words) words = 'Zero';

  let result = `Rupees ${words}`;
  if (paise > 0) {
    result += ` and ${convertTwoDigits(paise)} Paise`;
  }
  result += ' Only/-';

  return result;
}

export function generateInvoicePDF(
  sale: Sale,
  items: SaleItem[],
  customer: Customer | undefined,
  settings: BusinessSettings
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2); // 186mm

  // Professional High Contrast Invoice Color Palette
  const tealPrimary = [13, 110, 110]; // #0D6E6E
  const navySecondary = [30, 41, 59]; // #1E293B
  const mintLightBg = [238, 250, 250]; // #EEFAFA
  const cardLightBg = [252, 253, 254]; // #FCFDFE
  const textDark = [15, 23, 42]; // #0F172A (Deep Slate Black)
  const textMuted = [100, 116, 139]; // #64748B
  const textSlate = [51, 65, 85]; // #334155
  const borderLight = [203, 213, 225]; // #CBD5E1

  // ==========================================
  // 1. TOP TWO-SECTION HEADER
  // ==========================================
  const headerY = 12;
  const headerHeight = 22;
  const leftHeaderWidth = 108; // 108mm for PURIT / BAAMC
  const rightHeaderWidth = contentWidth - leftHeaderWidth; // 78mm for GST TAX INVOICE

  // Left Header Box (Teal)
  doc.setFillColor(tealPrimary[0], tealPrimary[1], tealPrimary[2]);
  doc.rect(margin, headerY, leftHeaderWidth, headerHeight, 'F');

  // Business Short Name / Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(settings.businessName || 'PURIT', margin + 6, headerY + 11);

  // Business Tagline / Subtitle (e.g. BAAMC)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(204, 251, 241); // Light mint
  doc.text(settings.tagline || 'BAAMC', margin + 6, headerY + 17.5);

  // Right Header Box (Deep Slate)
  doc.setFillColor(navySecondary[0], navySecondary[1], navySecondary[2]);
  doc.rect(margin + leftHeaderWidth, headerY, rightHeaderWidth, headerHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  const invoiceHeading = sale.gstEnabled ? 'GST TAX INVOICE' : 'BILL OF SUPPLY / INVOICE';
  doc.text(invoiceHeading, margin + leftHeaderWidth + (rightHeaderWidth / 2), headerY + 13.5, { align: 'center' });

  // ==========================================
  // 2. COMPACT INFORMATION ROW
  // ==========================================
  const infoRowY = headerY + headerHeight; // 34
  const infoRowHeight = 14;

  doc.setFillColor(mintLightBg[0], mintLightBg[1], mintLightBg[2]);
  doc.rect(margin, infoRowY, contentWidth, infoRowHeight, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.rect(margin, infoRowY, contentWidth, infoRowHeight, 'D');

  const colWidth = contentWidth / 3;

  // Column 1: Invoice No.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Invoice No.', margin + 6, infoRowY + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(tealPrimary[0], tealPrimary[1], tealPrimary[2]);
  doc.text(sale.invoiceNumber, margin + 6, infoRowY + 10.5);

  // Column 2: Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Date', margin + colWidth + 6, infoRowY + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(formatDate(sale.saleDate).toUpperCase(), margin + colWidth + 6, infoRowY + 10.5);

  // Column 3: Place of Supply
  const placeOfSupply = sale.placeOfSupply || 
    (customer?.state ? `${customer.state} (${customer.stateCode || '32'})` : 
    (settings.placeOfSupply || `${settings.state || 'Kerala'} (${settings.stateCode || '32'})`));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Place of Supply', margin + (colWidth * 2) + 6, infoRowY + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(placeOfSupply, margin + (colWidth * 2) + 6, infoRowY + 10.5);

  // ==========================================
  // 3. SELLER & BUYER SECTION (Side-by-Side)
  // Dynamic Height calculation so address and data fit inside the box perfectly!
  // ==========================================
  const cardsY = infoRowY + infoRowHeight + 3.5; // 51.5
  const cardGap = 4;
  const cardWidth = (contentWidth - cardGap) / 2; // 91mm each
  const cardHeaderHeight = 7;

  // Prepare seller text
  const sellerTitle = `${settings.businessName || 'PURIT'} (${settings.tagline || 'BAAMC'})`;
  const rawSellerAddress = settings.address || 'APTA COWORKS, Building No. 61A, Kuzhippuram Vengara Road, Kottapparambu, Parappur, Malappuram, Kerala - 676304';
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const sellerAddressLines = doc.splitTextToSize(rawSellerAddress, cardWidth - 10);

  // Prepare buyer text
  const buyerDisplayName = customer?.legalName || customer?.restaurantName || sale.customerLegalName || sale.customerName || 'Valued Client';
  const buyerAddress = customer?.billingAddress || customer?.address || sale.customerBillingAddress || sale.customerAddress || 'Local Store / Delivery Address';
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const buyerAddressLines = doc.splitTextToSize(buyerAddress, cardWidth - 10);
  const buyerPhone = customer?.phone || sale.customerPhone;
  const buyerGstin = customer?.gstin || sale.customerGstin;

  // Calculate dynamic card height to comfortably contain all address lines without overflowing
  const maxLines = Math.max(sellerAddressLines.length, buyerAddressLines.length);
  const cardHeight = Math.max(40, cardHeaderHeight + 12 + (maxLines * 4) + (buyerGstin || settings.gstin ? 7 : 4));

  // --- SELLER CARD (Left) ---
  const sellerX = margin;
  // Header Bar
  doc.setFillColor(tealPrimary[0], tealPrimary[1], tealPrimary[2]);
  doc.rect(sellerX, cardsY, cardWidth, cardHeaderHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SELLER', sellerX + (cardWidth / 2), cardsY + 5.1, { align: 'center' });

  // Box Body
  doc.setFillColor(cardLightBg[0], cardLightBg[1], cardLightBg[2]);
  doc.rect(sellerX, cardsY + cardHeaderHeight, cardWidth, cardHeight - cardHeaderHeight, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.rect(sellerX, cardsY + cardHeaderHeight, cardWidth, cardHeight - cardHeaderHeight, 'D');

  let sY = cardsY + cardHeaderHeight + 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(sellerTitle, sellerX + 5, sY);

  sY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textSlate[0], textSlate[1], textSlate[2]);
  doc.text(sellerAddressLines, sellerX + 5, sY);

  sY += (sellerAddressLines.length * 3.8) + 2;
  if (settings.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(tealPrimary[0], tealPrimary[1], tealPrimary[2]);
    doc.text(`GSTIN: ${settings.gstin}`, sellerX + 5, sY);
  }

  // --- BUYER CARD (Right) ---
  const buyerX = margin + cardWidth + cardGap;
  // Header Bar
  doc.setFillColor(navySecondary[0], navySecondary[1], navySecondary[2]);
  doc.rect(buyerX, cardsY, cardWidth, cardHeaderHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('BUYER', buyerX + (cardWidth / 2), cardsY + 5.1, { align: 'center' });

  // Box Body
  doc.setFillColor(cardLightBg[0], cardLightBg[1], cardLightBg[2]);
  doc.rect(buyerX, cardsY + cardHeaderHeight, cardWidth, cardHeight - cardHeaderHeight, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.rect(buyerX, cardsY + cardHeaderHeight, cardWidth, cardHeight - cardHeaderHeight, 'D');

  let bY = cardsY + cardHeaderHeight + 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(buyerDisplayName, buyerX + 5, bY);

  bY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textSlate[0], textSlate[1], textSlate[2]);
  doc.text(buyerAddressLines, buyerX + 5, bY);

  bY += (buyerAddressLines.length * 3.8) + 2;
  if (buyerPhone && bY < cardsY + cardHeight - 5) {
    doc.text(`Phone: ${buyerPhone}`, buyerX + 5, bY);
    bY += 4;
  }

  if (buyerGstin && sale.gstEnabled) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(tealPrimary[0], tealPrimary[1], tealPrimary[2]);
    doc.text(`GSTIN: ${buyerGstin}`, buyerX + 5, bY);
  }

  // ==========================================
  // 4. ITEMS TABLE (Bold, Big, Clear, High Visibility)
  // ==========================================
  const tableStartY = cardsY + cardHeight + 4;

  const tableRows = items.map((item) => {
    return [
      item.productName,
      `${item.quantity} ${item.unit || ''}`.trim(),
      item.unitSellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      item.totalBeforeGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    head: [['ITEM DESCRIPTION', 'QTY', 'RATE (Rs.)', 'AMOUNT (Rs.)']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [tealPrimary[0], tealPrimary[1], tealPrimary[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9.5,
      cellPadding: 3.5,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 92, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
    },
    styles: {
      fontSize: 9.5,
      textColor: [textDark[0], textDark[1], textDark[2]],
      cellPadding: 3.5,
      lineColor: [borderLight[0], borderLight[1], borderLight[2]],
      lineWidth: 0.3,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [cardLightBg[0], cardLightBg[1], cardLightBg[2]],
    },
  });

  // @ts-ignore
  let currentY = doc.lastAutoTable.finalY + 4;

  // Page overflow check
  if (currentY > 215) {
    doc.addPage();
    currentY = 16;
  }

  // ==========================================
  // 5. TOTAL CALCULATION SECTION (Right Aligned, Bold & Big)
  // ==========================================
  const totalsWidth = 92;
  const totalsLeft = pageWidth - margin - totalsWidth;
  const totalsRight = pageWidth - margin;

  // Subtotal / Product Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textSlate[0], textSlate[1], textSlate[2]);
  doc.text('Product Total', totalsLeft + 4, currentY + 4.5);
  doc.text(`Rs. ${sale.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsRight - 4, currentY + 4.5, { align: 'right' });

  currentY += 6.5;

  // Discount if any
  if (sale.discount > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(185, 28, 28);
    doc.text('Discount', totalsLeft + 4, currentY + 4.5);
    doc.text(`- Rs. ${sale.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsRight - 4, currentY + 4.5, { align: 'right' });
    currentY += 6.5;
  }

  // If GST is enabled, show 9% CGST and 9% SGST
  if (sale.gstEnabled && sale.gstAmount > 0) {
    const halfGst = Math.round(((sale.gstAmount / 2) + Number.EPSILON) * 100) / 100;
    const cgstRate = (sale.gstRate || 18) / 2;
    const sgstRate = cgstRate;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(textSlate[0], textSlate[1], textSlate[2]);
    doc.text(`CGST @ ${cgstRate}%`, totalsLeft + 4, currentY + 4.5);
    doc.text(`Rs. ${halfGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsRight - 4, currentY + 4.5, { align: 'right' });
    currentY += 6.5;

    doc.text(`SGST @ ${sgstRate}%`, totalsLeft + 4, currentY + 4.5);
    doc.text(`Rs. ${halfGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsRight - 4, currentY + 4.5, { align: 'right' });
    currentY += 6.5;
  }

  // Paid & Pending balance if any
  if (sale.paidAmount > 0 && sale.paidAmount !== sale.invoiceTotal) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(22, 101, 52);
    doc.text('Amount Paid', totalsLeft + 4, currentY + 4.5);
    doc.text(`Rs. ${sale.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsRight - 4, currentY + 4.5, { align: 'right' });
    currentY += 6.5;
  }
  if (sale.pendingAmount > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(185, 28, 28);
    doc.text('Balance Due', totalsLeft + 4, currentY + 4.5);
    doc.text(`Rs. ${sale.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsRight - 4, currentY + 4.5, { align: 'right' });
    currentY += 6.5;
  }

  // GRAND TOTAL Box (Large, Bold, High Visibility)
  const grandTotalHeight = 11;
  doc.setFillColor(tealPrimary[0], tealPrimary[1], tealPrimary[2]);
  doc.rect(totalsLeft, currentY + 1, totalsWidth, grandTotalHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('GRAND TOTAL', totalsLeft + 5, currentY + 8);
  doc.setFontSize(11.5);
  doc.text(`Rs. ${sale.invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsRight - 5, currentY + 8, { align: 'right' });

  currentY += grandTotalHeight + 6;

  // ==========================================
  // 6. AMOUNT IN WORDS
  // ==========================================
  const amountWords = numberToWordsIndian(sale.invoiceTotal);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  
  const maxWordsWidth = contentWidth - 42;
  const wordLines = doc.splitTextToSize(amountWords, maxWordsWidth);
  const wordsBoxHeight = Math.max(11, 6 + (wordLines.length * 4.2));

  doc.setFillColor(mintLightBg[0], mintLightBg[1], mintLightBg[2]);
  doc.rect(margin, currentY, contentWidth, wordsBoxHeight, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.rect(margin, currentY, contentWidth, wordsBoxHeight, 'D');

  doc.setTextColor(tealPrimary[0], tealPrimary[1], tealPrimary[2]);
  doc.text('Amount in Words:', margin + 4, currentY + 6.5);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(wordLines, margin + 38, currentY + 6.5);

  currentY += wordsBoxHeight + 4.5;

  // ==========================================
  // 7. DECLARATION & AUTHORIZED SIGNATORY (Footer)
  // ==========================================
  const footerCardHeight = 28;
  const decWidth = 104; // Left box
  const signWidth = contentWidth - decWidth - 4; // Right box (78mm)

  // --- Left: Declaration ---
  const decX = margin;
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setFillColor(cardLightBg[0], cardLightBg[1], cardLightBg[2]);
  doc.rect(decX, currentY, decWidth, footerCardHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Declaration', decX + 4, currentY + 6);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const declarationText = settings.invoiceFooter || 
    'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.';
  const decLines = doc.splitTextToSize(declarationText, decWidth - 8);
  doc.text(decLines, decX + 4, currentY + 12);

  // --- Right: Authorized Signatory ---
  const signX = margin + decWidth + 4;
  doc.setFillColor(mintLightBg[0], mintLightBg[1], mintLightBg[2]);
  doc.rect(signX, currentY, signWidth, footerCardHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(tealPrimary[0], tealPrimary[1], tealPrimary[2]);
  doc.text(`For ${settings.businessName || 'PURIT'} ${settings.tagline || 'BAAMC'}`, signX + (signWidth / 2), currentY + 6.5, { align: 'center' });

  // Signatory Signature space & Line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Authorized Signatory', signX + (signWidth / 2), currentY + 18.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(settings.authorizedSignatory || 'Sinan Abdulatif', signX + (signWidth / 2), currentY + 24, { align: 'center' });

  return doc;
}

export function downloadInvoicePDF(
  sale: Sale,
  items: SaleItem[],
  customer: Customer | undefined,
  settings: BusinessSettings
) {
  const doc = generateInvoicePDF(sale, items, customer, settings);
  const cleanInvNum = (sale.invoiceNumber || 'Invoice').replace(/[/\\?%*:|"<>]/g, '_');
  doc.save(`PURIT_Invoice_${cleanInvNum}.pdf`);
}

export async function shareInvoiceViaWhatsApp(
  sale: Sale,
  items: SaleItem[],
  customer: Customer | undefined,
  settings: BusinessSettings
) {
  const cleanInvNum = (sale.invoiceNumber || 'Invoice').replace(/[/\\?%*:|"<>]/g, '_');
  const filename = `PURIT_Invoice_${cleanInvNum}.pdf`;
  const doc = generateInvoicePDF(sale, items, customer, settings);
  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

  const rawPhone = customer?.phone || sale.customerPhone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const messageText = `Hello ${customer?.restaurantName || sale.customerName},\n\nPlease find attached your tax invoice *#${sale.invoiceNumber}* from *${settings.businessName || 'PURIT'}*.\n\n*Invoice Summary:*\n- Total Amount: *₹${sale.invoiceTotal.toFixed(2)}*\n- Amount Paid: *₹${sale.paidAmount.toFixed(2)}*\n- Pending Balance: *₹${sale.pendingAmount.toFixed(2)}*\n\nThank you for your business!`;

  // 1. Try Native Web Share API with File Attachment (Supports direct WhatsApp share on mobile & modern desktop)
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        title: `Invoice ${sale.invoiceNumber}`,
        text: messageText,
        files: [pdfFile],
      });
      return;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // User cancelled share
      }
      console.warn('Native share failed, falling back to WhatsApp link & download', err);
    }
  }

  // 2. Fallback: Automatically trigger PDF download and open direct WhatsApp Web chat with prefilled message
  downloadInvoicePDF(sale, items, customer, settings);

  const encodedText = encodeURIComponent(messageText);
  const whatsappUrl = targetPhone 
    ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  window.open(whatsappUrl, '_blank');
}

export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      headers.map(header => {
        const val = row[header] ?? '';
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
