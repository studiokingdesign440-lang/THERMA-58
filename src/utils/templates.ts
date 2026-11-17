import type {PrintBlock, PrintTemplate} from '../types/printer';

function freshId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function cloneBlocksWithNewIds(blocks: PrintBlock[]): PrintBlock[] {
  return blocks.map((block) => {
    if (block.type === 'checklist') {
      return {
        ...block,
        id: freshId('chk'),
        items: block.items.map((item) => ({
          ...item,
          id: freshId('item'),
        })),
      };
    }
    if (block.type === 'image') {
      return {
        ...block,
        id: freshId('img'),
      };
    }
    if (block.type === 'divider') {
      return {
        ...block,
        id: freshId('div'),
      };
    }
    return {
      ...block,
      id: freshId('txt'),
    };
  });
}

export const BUILTIN_TEMPLATES: PrintTemplate[] = [
  {
    id: 'tpl-sales-receipt',
    name: 'Sales Receipt',
    category: 'receipt',
    description: 'Itemized 58mm store receipt with header, totals, and footer.',
    builtIn: true,
    createdAt: 1700000000000,
    blocks: [
      {
        id: 't1-hdr',
        type: 'text',
        content: 'NORTHSIDE ROASTERS',
        fontFamily: 'jetbrains',
        fontSize: 22,
        lineHeight: 1.2,
        bold: true,
        italic: false,
        align: 'center',
      },
      {
        id: 't1-sub',
        type: 'text',
        content: '412 Market St · Terminal #02',
        fontFamily: 'ibm-plex',
        fontSize: 13,
        lineHeight: 1.3,
        bold: false,
        italic: false,
        align: 'center',
      },
      {id: 't1-d1', type: 'divider', style: 'dashed', spacingY: 6},
      {
        id: 't1-meta',
        type: 'text',
        content: 'Order: #1048\nDate:  2026-11-17 09:42\nCashier: M. Lin',
        fontFamily: 'jetbrains',
        fontSize: 14,
        lineHeight: 1.4,
        bold: false,
        italic: false,
        align: 'left',
      },
      {id: 't1-d2', type: 'divider', style: 'solid', spacingY: 4},
      {
        id: 't1-items',
        type: 'text',
        content:
          '2x Pour Over Filter     $9.00\n1x Rye Sourdough Loaf    $7.50\n1x Oat Cortado           $4.75',
        fontFamily: 'jetbrains',
        fontSize: 14,
        lineHeight: 1.5,
        bold: false,
        italic: false,
        align: 'left',
      },
      {id: 't1-d3', type: 'divider', style: 'dashed', spacingY: 4},
      {
        id: 't1-tot',
        type: 'text',
        content: 'SUBTOTAL               $21.25\nTAX (8%)                $1.70\nTOTAL PAID             $22.95',
        fontFamily: 'jetbrains',
        fontSize: 15,
        lineHeight: 1.45,
        bold: true,
        italic: false,
        align: 'left',
      },
      {id: 't1-d4', type: 'divider', style: 'dotted', spacingY: 6},
      {
        id: 't1-ftr',
        type: 'text',
        content: 'Thank you for visiting.\nKeep slip for pickup counter.',
        fontFamily: 'sans',
        fontSize: 13,
        lineHeight: 1.35,
        bold: false,
        italic: true,
        align: 'center',
      },
    ],
  },
  {
    id: 'tpl-shift-report',
    name: 'Daily Shift Report',
    category: 'report',
    description: 'Structured operations summary with metrics, inspection checklist, and sign-off.',
    builtIn: true,
    createdAt: 1700000000001,
    blocks: [
      {
        id: 't2-hdr',
        type: 'text',
        content: 'DAILY SHIFT REPORT',
        fontFamily: 'jetbrains',
        fontSize: 22,
        lineHeight: 1.2,
        bold: true,
        italic: false,
        align: 'center',
      },
      {
        id: 't2-sub',
        type: 'text',
        content: 'Station B · Evening Closeout',
        fontFamily: 'ibm-plex',
        fontSize: 14,
        lineHeight: 1.3,
        bold: false,
        italic: true,
        align: 'center',
      },
      {id: 't2-d1', type: 'divider', style: 'double', spacingY: 6},
      {
        id: 't2-sum',
        type: 'text',
        content:
          'Date:        2026-11-17\nTickets:     48 completed\nUptime:      99.4%\nIncidents:   0 open',
        fontFamily: 'jetbrains',
        fontSize: 14,
        lineHeight: 1.45,
        bold: false,
        italic: false,
        align: 'left',
      },
      {id: 't2-d2', type: 'divider', style: 'dashed', spacingY: 6},
      {
        id: 't2-chk',
        type: 'checklist',
        title: 'Closeout Verification',
        fontFamily: 'jetbrains',
        fontSize: 15,
        lineHeight: 1.45,
        bold: false,
        italic: false,
        align: 'left',
        items: [
          {id: 't2-c1', text: 'Cash drawer reconciled', checked: true},
          {id: 't2-c2', text: 'Thermal stock replenished', checked: true},
          {id: 't2-c3', text: 'Backup synced to log', checked: false},
        ],
      },
      {id: 't2-d3', type: 'divider', style: 'solid', spacingY: 6},
      {
        id: 't2-sig',
        type: 'text',
        content: 'Supervisor Sign-off:\n\n______________________________',
        fontFamily: 'ibm-plex',
        fontSize: 13,
        lineHeight: 1.4,
        bold: false,
        italic: false,
        align: 'left',
      },
    ],
  },
  {
    id: 'tpl-packing-slip',
    name: 'Packing & Dispatch Slip',
    category: 'report',
    description: 'Warehouse dispatch ticket with destination block and QA checklist.',
    builtIn: true,
    createdAt: 1700000000002,
    blocks: [
      {
        id: 't3-hdr',
        type: 'text',
        content: 'PACKING SLIP #PK-882',
        fontFamily: 'jetbrains',
        fontSize: 20,
        lineHeight: 1.25,
        bold: true,
        italic: false,
        align: 'center',
      },
      {id: 't3-d1', type: 'divider', style: 'solid', spacingY: 4},
      {
        id: 't3-dest',
        type: 'text',
        content: 'SHIP TO:\nAtelier Hardware Co.\n740 Harbor Way, Dock 4',
        fontFamily: 'sans',
        fontSize: 15,
        lineHeight: 1.4,
        bold: true,
        italic: false,
        align: 'left',
      },
      {id: 't3-d2', type: 'divider', style: 'dashed', spacingY: 6},
      {
        id: 't3-chk',
        type: 'checklist',
        title: 'Box Contents',
        fontFamily: 'jetbrains',
        fontSize: 15,
        lineHeight: 1.45,
        bold: false,
        italic: false,
        align: 'left',
        items: [
          {id: 't3-c1', text: '2x 58mm Paper Rolls', checked: true},
          {id: 't3-c2', text: '1x USB-C Power Brick', checked: true},
          {id: 't3-c3', text: 'Calibration Card', checked: false},
        ],
      },
    ],
  },
  {
    id: 'tpl-task-ticket',
    name: 'Pocket Task Ticket',
    category: 'checklist',
    description: 'Compact tear-off task list formatted for 58mm desk use.',
    builtIn: true,
    createdAt: 1700000000003,
    blocks: [
      {
        id: 't4-hdr',
        type: 'text',
        content: 'TODAY · PRIORITY QUEUE',
        fontFamily: 'jetbrains',
        fontSize: 18,
        lineHeight: 1.25,
        bold: true,
        italic: false,
        align: 'left',
      },
      {id: 't4-d1', type: 'divider', style: 'dotted', spacingY: 4},
      {
        id: 't4-chk',
        type: 'checklist',
        title: '',
        fontFamily: 'jetbrains',
        fontSize: 16,
        lineHeight: 1.55,
        bold: false,
        italic: false,
        align: 'left',
        items: [
          {id: 't4-c1', text: 'Review morning dispatch logs', checked: false},
          {id: 't4-c2', text: 'Test Bluetooth firmware sync', checked: false},
          {id: 't4-c3', text: 'Archive signed receipts', checked: false},
        ],
      },
    ],
  },
];
