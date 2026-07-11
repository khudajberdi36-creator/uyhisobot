// ✅ Excel va PDF export funksiyalari
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ============================================================
// EXCEL EXPORT
// ============================================================
export function exportToExcel(data, filename = 'dokon-qarz') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Qarzlar');

  // Ustun kengliklarini avtomatik sozlash
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length)) + 2
  }));
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `${filename}-${new Date().toLocaleDateString('uz-UZ').replace(/\//g, '-')}.xlsx`);
}

// Qarzdorlar ro'yxatini Excel ga export qilish
export function exportQarzdorlarExcel(qarzdorlar) {
  const data = qarzdorlar.map((q, i) => ({
    '№': i + 1,
    'Ism': q.ism || '',
    'Familiya': q.familiya || '',
    'Telefon': q.telefon || '',
    'Manzil': q.manzil || '',
    'Jami qarz (UZS)': Number(q.jami_qarz || 0).toLocaleString('uz-UZ'),
    'Sana': q.created_at ? new Date(q.created_at).toLocaleDateString('uz-UZ') : '',
  }));
  exportToExcel(data, 'qarzdorlar');
}

// Qarzlar ro'yxatini Excel ga export qilish
export function exportQarzlarExcel(qarzlar, qarzdorIsm = '') {
  const data = qarzlar.map((q, i) => ({
    '№': i + 1,
    'Qarzdor': qarzdorIsm,
    'Summa': Number(q.summa || 0).toLocaleString('uz-UZ'),
    'Valyuta': q.valyuta || 'UZS',
    'Sabab': q.sabab || '',
    'Qarz sanasi': q.sana ? new Date(q.sana).toLocaleDateString('uz-UZ') : '',
    'Muddat': q.muddat ? new Date(q.muddat).toLocaleDateString('uz-UZ') : 'Belgilanmagan',
    'Status': q.status === 'active' ? 'Aktiv' : 'Yopilgan',
  }));
  exportToExcel(data, `${qarzdorIsm || 'qarzlar'}`);
}

// ============================================================
// PDF HISOBOT
// ============================================================
export function exportQarzdorlarPDF(qarzdorlar, dokonNomi = "Do'kon Qarz") {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(dokonNomi, 14, 20);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Qarzdorlar ro'yxati`, 14, 28);
  doc.text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 14, 34);

  // Jadval
  const tableData = qarzdorlar.map((q, i) => [
    i + 1,
    `${q.ism || ''} ${q.familiya || ''}`.trim(),
    q.telefon || '',
    Number(q.jami_qarz || 0).toLocaleString('uz-UZ') + ' UZS',
    q.created_at ? new Date(q.created_at).toLocaleDateString('uz-UZ') : '',
  ]);

  doc.autoTable({
    head: [['№', 'Ism Familiya', 'Telefon', 'Qolgan qarz', 'Qo\'shilgan sana']],
    body: tableData,
    startY: 40,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 255] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      3: { halign: 'right', fontStyle: 'bold' },
    }
  });

  // Footer — jami
  const jami = qarzdorlar.reduce((s, q) => s + Number(q.jami_qarz || 0), 0);
  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Jami qarz: ${jami.toLocaleString('uz-UZ')} UZS`, 14, finalY);
  doc.text(`Jami qarzdorlar: ${qarzdorlar.length} ta`, 14, finalY + 7);

  doc.save(`${dokonNomi}-qarzdorlar-${new Date().toLocaleDateString('uz-UZ').replace(/\//g, '-')}.pdf`);
}

// ============================================================
// KVITANSIYA / CHEK
// ============================================================
export function printKvitansiya({ qarzdor, qarz, tolov }) {
  const chekContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Kvitansiya</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; width: 300px; padding: 16px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
        h2 { font-size: 16px; }
        .big { font-size: 18px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="center">
        <h2>🏪 Do'kon Qarz</h2>
        <p style="font-size:12px">${new Date().toLocaleString('uz-UZ')}</p>
      </div>
      <div class="line"></div>
      <div class="row"><span>Qarzdor:</span><span class="bold">${qarzdor?.ism || ''} ${qarzdor?.familiya || ''}</span></div>
      <div class="row"><span>Telefon:</span><span>${qarzdor?.telefon || ''}</span></div>
      <div class="line"></div>
      ${qarz ? `
        <div class="row"><span>Qarz summasi:</span><span>${Number(qarz.summa || 0).toLocaleString('uz-UZ')} ${qarz.valyuta || 'UZS'}</span></div>
        <div class="row"><span>Qarz sanasi:</span><span>${qarz.sana ? new Date(qarz.sana).toLocaleDateString('uz-UZ') : ''}</span></div>
        ${qarz.muddat ? `<div class="row"><span>Muddat:</span><span>${new Date(qarz.muddat).toLocaleDateString('uz-UZ')}</span></div>` : ''}
        ${qarz.sabab ? `<div class="row"><span>Sabab:</span><span>${qarz.sabab}</span></div>` : ''}
      ` : ''}
      ${tolov ? `
        <div class="line"></div>
        <div class="center" style="margin:8px 0">
          <div style="font-size:12px">TO'LOV AMALGA OSHIRILDI</div>
          <div class="big">${Number(tolov.summa || 0).toLocaleString('uz-UZ')} UZS</div>
          <div style="font-size:12px">${tolov.sana ? new Date(tolov.sana).toLocaleDateString('uz-UZ') : ''}</div>
        </div>
      ` : ''}
      <div class="line"></div>
      <div class="center" style="font-size:11px; margin-top:8px">
        <p>Rahmat! ✓</p>
        <p style="color:#666">Do'kon Qarz tizimi</p>
      </div>
    </body>
    </html>
  `;

  const w = window.open('', '_blank', 'width=350,height=600');
  w.document.write(chekContent);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 500);
}