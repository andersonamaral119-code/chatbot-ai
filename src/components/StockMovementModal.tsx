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
  }) => void;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  products,
  onClose,
  onSaveMovement,
}) => {
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [type, setType] = useState<'entrada' | 'saida'>('entrada');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');

  const selectedProduct = products.find(p => p.id === productId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!productId || isNaN(qty) || qty <= 0) return;
    onSaveMovement({
      productId,
      type,
      quantity: qty,
      reason: reason.trim() || (type === 'entrada' ? 'Reposição' : 'Venda/Consumo'),
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

          <div>
            <label className="block text-xs text-slate-400 mb-1">Quantidade</label>
            <input
              type="number"
              min="1"
              max={type === 'saida' && selectedProduct ? selectedProduct.currentStock : undefined}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              required
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
