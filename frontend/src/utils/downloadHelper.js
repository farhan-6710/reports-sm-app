import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const downloadPDF = (data, filename = 'social-media-report.pdf') => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text('Social Media Analytics Report', 14, 22);
  
  // Date range
  doc.setFontSize(12);
  doc.text(
    `Period: ${data.dates?.start} to ${data.dates?.end}`,
    14,
    30
  );

  let yPos = 40;

  // Organic Metrics Table
  doc.setFontSize(14);
  doc.text('Organic Metrics', 14, yPos);
  yPos += 8;

  const organicData = [];
  Object.entries(data.metrics?.organic || {}).forEach(([key, value]) => {
    organicData.push([
      formatKey(key),
      typeof value === 'number' ? value.toLocaleString() : value
    ]);
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: organicData,
    theme: 'striped',
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Inorganic Metrics Table
  if (data.metrics?.inorganic) {
    doc.setFontSize(14);
    doc.text('Paid/Inorganic Metrics', 14, yPos);
    yPos += 8;

    const inorganicData = [];
    Object.entries(data.metrics.inorganic).forEach(([key, value]) => {
      inorganicData.push([
        formatKey(key),
        typeof value === 'number' ? value.toLocaleString() : value
      ]);
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: inorganicData,
      theme: 'striped',
    });
  }

  doc.save(filename);
};

export const downloadExcel = (data) => {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'social-media-report.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const convertToCSV = (data) => {
  const headers = ['Metric Type', 'Metric', 'Value'];
  const rows = [];

  // Add organic metrics
  Object.entries(data.metrics?.organic || {}).forEach(([key, value]) => {
    rows.push(['Organic', formatKey(key), value]);
  });

  // Add inorganic metrics
  Object.entries(data.metrics?.inorganic || {}).forEach(([key, value]) => {
    rows.push(['Inorganic', formatKey(key), value]);
  });

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

const formatKey = (key) => {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

