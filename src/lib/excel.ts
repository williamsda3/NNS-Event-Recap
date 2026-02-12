import ExcelJS from 'exceljs';
import { Project, FormTemplate, FormField, EventEntry } from '@/types';

interface ExportOptions {
  project: Project;
  template: FormTemplate;
  events: EventEntry[];
}

// Color scheme matching the NVTA example
const COLORS = {
  headerOrange: 'FFE8A839',
  headerBlue: 'FF00B0F0',
  metricBeige: 'FFFEF2CB',
  totalYellow: 'FFFFFF00',
  totalGreen: 'FF92D050',
  white: 'FFFFFFFF',
  black: 'FF000000',
};

function getColumnLetter(index: number): string {
  let result = '';
  while (index >= 0) {
    result = String.fromCharCode((index % 26) + 65) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
}

export async function generateExcel({ project, template, events }: ExportOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Event Recap Builder';
  workbook.created = new Date();

  // Create Pop-Up Event Stats sheet
  const statsSheet = workbook.addWorksheet('Pop-Up Event Stats');

  const sortedFields = [...template.fields].sort((a, b) => a.order - b.order);
  
  // Set column widths
  statsSheet.getColumn(1).width = 45; // Labels column
  for (let i = 0; i < events.length; i++) {
    statsSheet.getColumn(i + 2).width = 25;
  }
  statsSheet.getColumn(events.length + 2).width = 18; // Totals column

  // Row 1: Project title
  const titleCell = statsSheet.getCell('A1');
  titleCell.value = `${project.name} (${project.dateRange})`;
  titleCell.font = { bold: true, size: 11 };
  statsSheet.mergeCells(1, 1, 1, events.length + 2);

  // Build rows starting from row 2
  let currentRow = 2;
  
  for (const field of sortedFields) {
    const row = statsSheet.getRow(currentRow);
    
    // Label in column A
    const labelCell = row.getCell(1);
    labelCell.value = field.label;
    labelCell.font = { bold: field.category === 'header' || field.category === 'totals' };
    labelCell.alignment = { vertical: 'middle', wrapText: true };
    
    // Set row background color based on category
    let fillColor = COLORS.white;
    if (field.category === 'header') {
      fillColor = field.id === 'event_name' ? COLORS.headerOrange : COLORS.metricBeige;
    } else if (field.category === 'metrics') {
      fillColor = COLORS.metricBeige;
    } else if (field.category === 'totals') {
      fillColor = COLORS.totalYellow;
    }
    
    labelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fillColor }
    };

    // Event values in subsequent columns
    for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
      const event = events[eventIndex];
      const cell = row.getCell(eventIndex + 2);
      
      // Header row (Event Name) gets colored headers
      if (field.id === 'event_name') {
        const headerColors = [COLORS.headerOrange, COLORS.headerBlue, COLORS.totalGreen, COLORS.headerOrange, COLORS.headerBlue];
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: headerColors[eventIndex % headerColors.length] }
        };
        cell.font = { bold: true };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        };
      }

      if (field.type === 'calculated') {
        // Create Excel formula based on the formula definition
        const formula = createExcelFormula(field, eventIndex + 2, sortedFields, currentRow);
        if (formula) {
          cell.value = { formula };
        }
      } else if (field.type === 'url') {
        // Make URLs clickable hyperlinks
        const value = event.responses[field.id];
        if (value && typeof value === 'string' && value.trim()) {
          cell.value = {
            text: 'View Photos',
            hyperlink: value.trim()
          };
          cell.font = {
            color: { argb: 'FF0563C1' },
            underline: true
          };
        } else {
          cell.value = '';
        }
      } else {
        const value = event.responses[field.id];
        cell.value = value !== undefined ? value : '';
      }

      cell.alignment = { 
        vertical: 'middle', 
        horizontal: field.type === 'number' || field.type === 'calculated' ? 'center' : 'left',
        wrapText: field.type === 'longtext'
      };
      
      // Add border
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }

    // Totals column (last column)
    const totalCell = row.getCell(events.length + 2);
    
    if (field.id === 'event_name') {
      totalCell.value = 'Pop-Up Event Total';
      totalCell.font = { bold: true };
      totalCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.totalYellow }
      };
    } else if (field.type === 'number' || field.type === 'calculated') {
      // Sum formula across all events
      const startCol = getColumnLetter(1); // B
      const endCol = getColumnLetter(events.length); // Last event column
      totalCell.value = { formula: `SUM(${startCol}${currentRow}:${endCol}${currentRow})` };
      totalCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.totalYellow }
      };
    }
    
    totalCell.alignment = { vertical: 'middle', horizontal: 'center' };
    totalCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Make comments row taller
    if (field.type === 'longtext') {
      row.height = 120;
    }

    currentRow++;
  }

  // Create Aggregate Report sheet
  const aggregateSheet = workbook.addWorksheet('Aggregate Report');
  aggregateSheet.getColumn(1).width = 50;
  aggregateSheet.getColumn(2).width = 20;

  const aggregateTitle = aggregateSheet.getCell('A1');
  aggregateTitle.value = `Events Aggregate (Pop-Up Event Totals)`;
  aggregateTitle.font = { bold: true, size: 12 };

  // Add aggregate stats
  const numericFields = sortedFields.filter(f => f.type === 'number' || f.type === 'calculated');
  
  aggregateSheet.getCell('A2').value = 'Total # of Occurred Events';
  aggregateSheet.getCell('B2').value = `${events.length} of ${events.length}`;
  
  let aggRow = 3;
  for (const field of numericFields) {
    const fieldRow = sortedFields.findIndex(f => f.id === field.id) + 2; // +2 for header offset
    aggregateSheet.getCell(`A${aggRow}`).value = field.label;
    aggregateSheet.getCell(`B${aggRow}`).value = { 
      formula: `'Pop-Up Event Stats'!${getColumnLetter(events.length + 1)}${fieldRow}` 
    };
    aggRow++;
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function createExcelFormula(
  field: FormField, 
  colIndex: number, 
  allFields: FormField[],
  currentRow: number
): string | null {
  if (!field.formula) return null;

  // Parse the formula and convert field references to cell references
  let excelFormula = field.formula;
  
  // Find referenced fields and replace with cell references
  for (const f of allFields) {
    if (excelFormula.includes(f.id)) {
      const fieldRow = allFields.findIndex(af => af.id === f.id) + 2; // +2 for title row offset
      const colLetter = getColumnLetter(colIndex - 1);
      excelFormula = excelFormula.replace(new RegExp(f.id, 'g'), `${colLetter}${fieldRow}`);
    }
  }
  
  // Convert + to Excel-friendly format
  excelFormula = excelFormula.replace(/\s*\+\s*/g, '+');
  
  return excelFormula;
}
