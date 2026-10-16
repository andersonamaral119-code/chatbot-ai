export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  unitCost: number;
  unitPrice: number;
  lastUpdated: string;
  code?: string;
  boxes_per_pallet?: number;
  total_boxes?: number;
  full_pallets?: number;
  loose_boxes?: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  productCode?: string;
  productName: string;
  type: 'entrada' | 'saida';
  quantity: number;
  pallets?: number;
  loose?: number;
  date: string;
  reason: string;
  lot?: string;
  notes?: string;
  created_by?: string;
  created_by_email?: string;
  status?: 'active' | 'reversed';
  reversed_at?: string;
  reversed_by?: string;
  reversal_reason?: string;
  reversal_entry_id?: string;
}