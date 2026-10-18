import React, { useState } from 'react';
import { Product } from '../types/inventory';

interface StockMovementModalProps {
  products: Product[];
  onClose: () => void;
  onSaveMovement: (movement: {
    productId: string;
    type: 'entrada' | 'saida';
    quantity: number;
    pallets: number;
    loose: number;
    reason: string;
    lot?: string;
    notes?: string;
  }) => Promise<boolean | void>;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  products,
  onClose,
  onSaveMovement,
}) => {
  const activeProducts = products.filter(p => p.is_active !== false);
  const [productId, setProductId] = useState(activeProducts[0]?.id || products[0]?.id || '');
  const [type, setType] = useState<'entrada' | 'saida'>('entrada');
  const [pallets, setPallets] = useState('0');
  const [looseBoxes, setLooseBoxes] = useState('0');
  const [directBoxes, setDirectBoxes] = useState('0');
  const [lot, setLot] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const selectedProduct = products.find(p => p.id === productId);
  const bpp = selectedProduct?.boxes_per_pallet;
  const isBppPending = bpp == null || bpp <= 0;
  const totalCalculated = isBppPending
    ? Math.max(0, parseInt(directBoxes, 10) || 0)
    : (Math.max(0, parseInt(pallets, 10) || 0) * (bpp || 0)) + Math.max(0, parseInt(looseBoxes, 10) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    if (isSubmitting) return;

    if (!productId) {
      setFeedbackError('Selecione um produto cadastrado.');
      return;
    }

    const parsedPallets = Math.max(0, parseInt(pallets, 10) || 0);
    const parsedLoose = Math.max(0, parseInt(looseBoxes, 10) || 0);

    if (totalCalculated <= 0) {
      setFeedbackError('Informe ao menos 1 pallet ou 1 caixa avulsa válida.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSaveMovement({
        productId,
        type,
        quantity: totalCalculated,
        pallets: parsedPallets,
        loose: parsedLoose,
        reason: reason.trim() || (type === 'entrada' ? 'Entrada em estoque' : 'Saída de estoque'),
        lot: lot.trim() || undefined,
        notes: reason.trim() || undefined,
      });
      if (res === false) {
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setFeedbackError(err?.message || 'Falha ao registrar entrada.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-4">
          {type === 'entrada' ? 'Entrada de Estoque' : 'Saída de Estoque'}
        </h2>
        {feedbackError && (
          <div className="mb-3 p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
            {feedbackError}
          </div>
        )}
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
              {products.filter(p => p.is_active !== false).map(p => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} {p.boxes_per_pallet ? `(${p.boxes_per_pallet} cx/pl)` : '(Cx/Pallet Pendente)'}
                </option>
              ))}
            </select>
          </div>

          {isBppPending ? (
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800 text-xs text-amber-200 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                Caixas por Pallet pendente de validação
              </p>
              <p className="text-amber-300/80">
                Cálculo automático de pallets travado até confirmação cadastral. Informe as caixas diretamente:
              </p>
              <div>
                <label className="block text-xs text-amber-200 mb-1 font-medium">Total de Caixas Diretas</label>
                <input
                  type="number"
                  min="1"
                  value={directBoxes}
                  onChange={e => setDirectBoxes(e.target.value)}
                  placeholder="Informe o número de caixas"
                  className="w-full bg-slate-950 border border-amber-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          ) : (
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
          )}
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
              disabled={isSubmitting || totalCalculated <= 0}
              className="px-4 py-2 text-sm rounded-lg bg-cyan-600 hover:bg-cyan-500 font-medium text-white disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Registrando...' : type === 'entrada' ? 'Registrar Entrada' : 'Confirmar Saída'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
