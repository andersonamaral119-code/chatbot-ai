import React, { useState } from 'react';
import { Product } from '../types/inventory';

interface StockMovementModalProps {
  products: Product[];
  onClose: () => void;
  onSaveMovement: (movement: {
    productId: string;
    type: 'entrada' | 'saida';
    quantity: number;
    reason: string;
    lot?: string;
    notes?: string;
  }) => void;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  products,
  onClose,
  onSaveMovement,
}) => {
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [type, setType] = useState<'entrada' | 'saida'>('entrada');
  const [pallets, setPallets] = useState('0');
  const [looseBoxes, setLooseBoxes] = useState('0');
  const [lot, setLot] = useState('');
  const [reason, setReason] = useState('');

  const selectedProduct = products.find(p => p.id === productId);
  const bpp = selectedProduct?.boxes_per_pallet || 28;
  const totalCalculated = (Math.max(0, parseInt(pallets, 10) || 0) * bpp) + Math.max(0, parseInt(looseBoxes, 10) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || totalCalculated <= 0) return;
    onSaveMovement({
      productId,
      type,
      quantity: totalCalculated,
      reason: reason.trim() || (type === 'entrada' ? 'Entrada em estoque' : 'Saída de estoque'),
      lot: lot.trim() || undefined,
      notes: `Paletes: ${pallets} | Avulsas: ${looseBoxes}`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-4">Lançar Movimentação</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tipo de Movimentação</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('entrada')}
                className={`py-2 text-sm rounded-lg font-medium border ${
                  type === 'entrada'
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                + Entrada
              </button>
              <button
                type="button"
                onClick={() => setType('saida')}
                className={`py-2 text-sm rounded-lg font-medium border ${
                  type === 'saida'
                    ? 'bg-rose-950 border-rose-500 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                - Saída
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Produto</label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} (Atual: {p.currentStock})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Paletes ({bpp} cx/palete)</label>
              <input
                type="number"
                min="0"
                value={pallets}
                onChange={e => setPallets(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Caixas Avulsas</label>
              <input
                type="number"
                min="0"
                value={looseBoxes}
                onChange={e => setLooseBoxes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
          <div className="text-xs text-cyan-400 font-mono">
            Total de caixas a lançar: {totalCalculated} cx
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Lote</label>
            <input
              type="text"
              value={lot}
              onChange={e => setLot(e.target.value)}
              placeholder="Ex: L2024-04B"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Motivo / Observação</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={type === 'entrada' ? 'Ex: Fornecedor XYZ / NF 1023' : 'Ex: Pedido #8432'}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-lg bg-sky-600 hover:bg-sky-500 font-medium text-white"
            >
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
