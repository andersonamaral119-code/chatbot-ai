import React from 'react';
import { Product } from '../types/inventory';

interface InventoryTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  products,
  onEdit,
  onDelete,
}) => {
  if (products.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        Nenhum item em estoque cadastrado.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase text-slate-400">
          <tr>
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Produto</th>
            <th className="px-4 py-3">Cx/Palete</th>
            <th className="px-4 py-3 text-right">Estoque (Cx)</th>
            <th className="px-4 py-3 text-right">Paletes Fechados</th>
            <th className="px-4 py-3 text-right">Avulsas</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {products.map(p => {
            const isLow = p.currentStock <= p.minStock;
            const bpp = p.boxes_per_pallet;
            const hasBpp = bpp != null && bpp > 0;
            const pallets = hasBpp ? (p.full_pallets ?? Math.floor(p.currentStock / bpp)) : null;
            const loose = hasBpp ? (p.loose_boxes ?? (p.currentStock % bpp)) : null;
            const isInactive = p.is_active === false;
            return (
              <tr key={p.id} className={`hover:bg-slate-800/40 transition-colors ${isInactive ? 'opacity-60 bg-slate-950/50' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs text-sky-400">{p.code || p.sku}</td>
                <td className="px-4 py-3 font-medium text-white">
                  {p.name}
                  {isInactive && <span className="ml-2 text-[10px] uppercase font-bold px-1.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded">Inativo</span>}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {hasBpp ? `${bpp} cx` : <span className="text-amber-400 text-xs italic font-medium">Pendente</span>}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-white">{p.currentStock}</td>
                <td className="px-4 py-3 text-right text-slate-300">{pallets != null ? `${pallets} plt` : '—'}</td>
                <td className="px-4 py-3 text-right text-slate-300">{loose != null ? `${loose} cx` : '—'}</td>
                <td className="px-4 py-3 text-center">
                  {isInactive ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                      Desativado
                    </span>
                  ) : isLow ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-950 text-amber-400 border border-amber-800">
                      Baixo Estoque
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Regular
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => onEdit(p)}
                    className="text-sky-400 hover:text-sky-300 text-xs font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(p.id)}
                    className="text-rose-400 hover:text-rose-300 text-xs font-medium"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
