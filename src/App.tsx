import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Product, StockMovement } from './types/inventory';
import { MetricsCards } from './components/MetricsCards';
import { InventoryTable } from './components/InventoryTable';
import { ProductModal } from './components/ProductModal';
import { StockMovementModal } from './components/StockMovementModal';
import { AiAssistant } from './components/AiAssistant';
import { AuthModal } from '@/components/AuthModal';
import { supabase } from '@/integrations/supabase/client';

const REQUIRED_CATALOG = [
  { code: 'PP0103', name: 'Frutas 400g (Marilan)', category: 'Marilan' },
  { code: 'PP0104', name: 'Festtone Chocolate (Festtone)', category: 'Festtone' },
  { code: 'PP0105', name: 'Trufado Chocolate 400g (Festtone)', category: 'Festtone' },
  { code: 'PP0130', name: 'Frutas 750g (Marilan)', category: 'Marilan' },
  { code: 'PP0131', name: 'Chocotone 750g (Marilan)', category: 'Marilan' },
  { code: 'PP0401', name: 'Muffato Panettone Frutas Sachê (Marilan — Produzido para a rede Muffato)', category: 'Marilan' },
  { code: 'PP5201', name: 'Gotas 400g (Marilan)', category: 'Marilan' },
  { code: 'PP5704', name: 'Gotas 400g (Marilan)', category: 'Marilan' },
  { code: 'PP5984', name: 'Identificação manual (Marilan — Etiqueta colada em caixa padrão Marilan)', category: 'Marilan' },
  { code: 'PP7304', name: 'Pan Rede Allos Choco 400g (Marilan — Produzido para rede parceira)', category: 'Marilan' },
  { code: 'PP8114', name: 'Trufado Brigadeiro 400g (Festtone)', category: 'Festtone' },
  { code: 'PP8117', name: 'Premium Brigadeiro 550g (Festtone)', category: 'Festtone' },
  { code: 'PP8121', name: 'Chocotone / Trufado 450g (Festtone)', category: 'Festtone' },
  { code: 'PP8122', name: 'Chocotone / Meio Amargo 450g (Festtone)', category: 'Festtone' },
  { code: 'PP8124', name: 'Limão / Gotas / Merengue 450g (Festtone)', category: 'Festtone' },
];

const INITIAL_PRODUCTS: Product[] = REQUIRED_CATALOG.map((item, index) => ({
  id: `prod-init-${index + 1}`,
  sku: item.code,
  code: item.code,
  name: item.name,
  category: item.category,
  boxes_per_pallet: 28,
  currentStock: 0,
  minStock: 28,
  unitCost: 0,
  unitPrice: 0,
  lastUpdated: new Date().toISOString(),
}));

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('marisoft_inventory_products');
    const parsed: Product[] = saved ? JSON.parse(saved) : [];
    const map = new Map<string, Product>();

    parsed.forEach(p => {
      const key = (p.code || p.sku || '').toUpperCase();
      if (key) map.set(key, p);
    });

    REQUIRED_CATALOG.forEach((req, idx) => {
      const key = req.code.toUpperCase();
      const existing = map.get(key);
      if (existing) {
        map.set(key, {
          ...existing,
          code: req.code,
          sku: req.code,
          name: key === 'PP8124' ? 'Limão / Gotas / Merengue 450g (Festtone)' : (existing.name || req.name),
          boxes_per_pallet: key === 'PP8124' ? 28 : (existing.boxes_per_pallet ?? 28),
        });
      } else {
        map.set(key, {
          id: `prod-init-${idx + 1}`,
          sku: req.code,
          code: req.code,
          name: req.name,
          category: req.category,
          boxes_per_pallet: 28,
          currentStock: 0,
          minStock: 28,
          unitCost: 0,
          unitPrice: 0,
          lastUpdated: new Date().toISOString(),
        });
      }
    });

    return Array.from(map.values());
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('marisoft_inventory_movements');
    return saved ? JSON.parse(saved) : [];
  });

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [activeTab, setActiveTab] = useState<'consulta' | 'historico'>('consulta');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [reversalTarget, setReversalTarget] = useState<StockMovement | null>(null);
  const [reversalReasonInput, setReversalReasonInput] = useState('');

  useEffect(() => {
    // Carregar e persistir sessão ativa do Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Preserva dados no localStorage sem apagar ou sobrescrever vazio
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('marisoft_inventory_products', JSON.stringify(products));
    }
  }, [products]);

  useEffect(() => {
    if (movements.length > 0) {
      localStorage.setItem('marisoft_inventory_movements', JSON.stringify(movements));
    }
  }, [movements]);

  // Leitura de produtos com colunas reais de public.products e saldos
  const fetchSupabaseProducts = async () => {
    if (!user) return;
    try {
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('id, code, name, boxes_per_pallet, created_at');

      if (prodErr || !prodData) return;

      const { data: balanceData } = await supabase
        .from('stock_balance')
        .select('id, boxes, loose, pallets');

      const balanceMap = new Map((balanceData ?? []).map((b: any) => [b.id, b]));

      // Carregar histórico persistido de stock_entries
      const { data: entriesData } = await supabase
        .from('stock_entries')
        .select('id, product_id, boxes, pallets_count, loose_boxes, lot, notes, created_at, created_by, status, reversed_at, reversed_by, reversal_reason, kind')
        .order('created_at', { ascending: false });

      if (entriesData) {
        const prodMap = new Map(prodData.map((p: any) => [p.id, p]));
        const loadedMovements: StockMovement[] = entriesData.map((e: any) => {
          const p = prodMap.get(e.product_id);
          const bpp = p?.boxes_per_pallet || 28;
          const total = Number(e.boxes) || 0;
          const absTotal = Math.abs(total);
          const isSaida = e.kind === 'saida_carregamento' || total < 0;
          const calculatedPallets = e.pallets_count != null ? Number(e.pallets_count) : Math.floor(absTotal / bpp);
          const calculatedLoose = e.loose_boxes != null ? Number(e.loose_boxes) : (absTotal % bpp);
          return {
            id: e.id,
            productId: e.product_id,
            productCode: p?.code || 'N/A',
            productName: p?.name || 'Produto',
            type: isSaida ? 'saida' : 'entrada',
            kind: e.kind,
            quantity: total,
            pallets: calculatedPallets,
            loose: calculatedLoose,
            date: new Date(e.created_at).toLocaleString('pt-BR'),
            reason: e.reason || e.notes || (isSaida ? 'Saída de carregamento' : 'Entrada em estoque'),
            lot: e.lot || '-',
            notes: e.notes || '',
            created_by: e.created_by,
            status: (e.status === 'reversed' || Boolean(e.reversed_at)) ? 'reversed' : 'active',
            reversed_at: e.reversed_at ? new Date(e.reversed_at).toLocaleString('pt-BR') : undefined,
            reversed_by: e.reversed_by,
            reversal_reason: e.reversal_reason,
          };
        });
        setMovements(loadedMovements);
      }

      if (prodData.length > 0) {
        const mapped: Product[] = prodData.map((p: any) => {
          const b = balanceMap.get(p.id);
          const bpp = p.boxes_per_pallet ?? 28;
          const boxes = b?.boxes != null ? Number(b.boxes) : 0;
          return {
            id: p.id,
            sku: p.code,
            code: p.code,
            name: p.name,
            boxes_per_pallet: bpp,
            category: p.name?.includes('Festtone') ? 'Festtone' : 'Marilan',
            currentStock: boxes,
            full_pallets: b?.pallets != null ? Number(b.pallets) : Math.floor(boxes / bpp),
            loose_boxes: b?.loose != null ? Number(b.loose) : (boxes % bpp),
            minStock: 28,
            unitCost: 0,
            unitPrice: 0,
            lastUpdated: p.created_at || new Date().toISOString(),
          };
        });
        setProducts(mapped);
      }
    } catch (err) {
      console.warn('Erro ao carregar do Supabase; mantendo dados locais:', err);
    }
  };

  useEffect(() => {
    fetchSupabaseProducts();
  }, [user]);

  const handleSaveProduct = async (productData: Omit<Product, 'id' | 'lastUpdated'> & { id?: string }) => {
    const payload = {
      code: productData.code || productData.sku,
      name: productData.name,
      boxes_per_pallet: productData.boxes_per_pallet ?? 28,
    };

    if (user) {
      if (productData.id && !productData.id.startsWith('prod-')) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', productData.id);

        if (error) {
          alert(`Falha ao salvar produto no Supabase: ${error.message}`);
          return;
        }
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([payload])
          .select('id')
          .single();

        if (error) {
          alert(`Falha ao cadastrar produto no Supabase: ${error.message}`);
          return;
        }
        if (data?.id) {
          productData.id = data.id;
        }
      }
    }

    // ponytail: atualiza estado e localStorage local mantendo compatibilidade offline
    if (productData.id) {
      setProducts(prev =>
        prev.map(p =>
          p.id === productData.id
            ? { ...p, ...productData, lastUpdated: new Date().toISOString() }
            : p
        )
      );
    } else {
      const newProduct: Product = {
        ...productData,
        id: `prod-${Date.now()}`,
        lastUpdated: new Date().toISOString(),
      };
      setProducts(prev => [newProduct, ...prev]);
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Deseja realmente excluir este produto?')) return;

    if (user && !id.startsWith('prod-')) {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        // PostgreSQL 23503 = foreign key violation (ON DELETE RESTRICT)
        if (error.code === '23503' || error.message.toLowerCase().includes('violates foreign key constraint') || error.message.toLowerCase().includes('restrict')) {
          alert('Não é possível excluir: o produto possui movimentações de estoque registradas no histórico. A exclusão foi bloqueada para proteger a integridade dos dados.');
          return;
        }
        alert(`Erro ao excluir produto no Supabase: ${error.message}`);
        return;
      }
    }

    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleSaveMovement = async (movement: {
    productId: string;
    type: 'entrada' | 'saida';
    quantity: number;
    pallets: number;
    loose: number;
    reason: string;
    lot?: string;
    notes?: string;
  }): Promise<boolean | void> => {
    const target = products.find(p => p.id === movement.productId);
    if (!target) {
      setFeedback({ type: 'error', message: 'Produto selecionado não encontrado.' });
      return false;
    }

    if (!user) {
      setFeedback({ type: 'error', message: 'Sessão necessária para salvar no banco de dados.' });
      return false;
    }

    // Validar se produto existe no Supabase (não é apenas temporário)
    let targetDbId = target.id;
    if (targetDbId.startsWith('prod-')) {
      const { data: dbProd, error: dbErr } = await supabase
        .from('products')
        .select('id')
        .eq('code', target.code || target.sku)
        .maybeSingle();

      if (dbErr || !dbProd) {
        // Inserir produto no catálogo do banco se ainda não estiver sincronizado
        const { data: inserted, error: insertProdErr } = await supabase
          .from('products')
          .insert([{
            code: target.code || target.sku,
            name: target.name,
            boxes_per_pallet: target.boxes_per_pallet || 28,
          }])
          .select('id')
          .single();

        if (insertProdErr || !inserted) {
          setFeedback({
            type: 'error',
            message: `Tabela de produtos inacessível no banco: ${insertProdErr?.message || 'registro ausente'}`,
          });
          return false;
        }
        targetDbId = inserted.id;
      } else {
        targetDbId = dbProd.id;
      }
    }

    const isSaida = movement.type === 'saida';
    const boxesSigned = isSaida ? -Math.abs(movement.quantity) : Math.abs(movement.quantity);
    const kindValue = isSaida ? 'saida_carregamento' : 'entrada';

    // Salvar persistentemente na tabela stock_entries configurada
    const { data: entryResult, error: entryError } = await supabase
      .from('stock_entries')
      .insert([{
        product_id: targetDbId,
        boxes: boxesSigned,
        kind: kindValue,
        pallets_count: movement.pallets,
        loose_boxes: movement.loose,
        lot: movement.lot || null,
        notes: movement.notes || null,
      }])
      .select('id, created_at')
      .single();

    if (entryError) {
      setFeedback({
        type: 'error',
        message: `Falha ao persistir ${isSaida ? 'saída' : 'entrada'} no Supabase: ${entryError.message}`,
      });
      return false;
    }

    // Recarregar saldos reais da view stock_balance e produtos
    await fetchSupabaseProducts();

    const newMovement: StockMovement = {
      id: entryResult?.id || `mov-${Date.now()}`,
      productId: targetDbId,
      productCode: target.code || target.sku,
      productName: target.name,
      type: movement.type,
      quantity: Math.abs(movement.quantity),
      pallets: movement.pallets,
      loose: movement.loose,
      date: entryResult?.created_at ? new Date(entryResult.created_at).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'),
      reason: movement.reason,
      lot: movement.lot || '-',
      notes: movement.notes || '',
      status: 'active',
    };

    setMovements(prev => [newMovement, ...prev]);
    setIsMovementModalOpen(false);
    setFeedback({
      type: 'success',
      message: `${isSaida ? 'Saída' : 'Entrada'} de ${Math.abs(movement.quantity)} caixas (${movement.pallets} plt + ${movement.loose} avulsas) registrada com sucesso!`,
    });
    return true;
  };

  const [reversingId, setReversingId] = useState<string | null>(null);

  const handleOpenReversalModal = (entry: StockMovement) => {
    if (entry.status === 'reversed' || reversingId === entry.id) return;
    const isSaida = entry.type === 'saida' || entry.kind === 'saida_carregamento';
    setReversalReasonInput(isSaida ? 'Estorno autorizado de saída de carregamento' : 'Estorno autorizado de entrada');
    setReversalTarget(entry);
  };

  const handleConfirmReversal = async () => {
    if (!reversalTarget || reversingId === reversalTarget.id) return;
    const trimmedReason = reversalReasonInput.trim();
    if (trimmedReason.length < 3) {
      setFeedback({ type: 'error', message: 'Informe um motivo com no mínimo 3 caracteres.' });
      return;
    }

    const entry = reversalTarget;
    const isSaida = entry.type === 'saida' || entry.kind === 'saida_carregamento';
    setReversingId(entry.id);

    try {
      const { error } = await supabase.rpc('reverse_stock_entry', {
        _entry_id: entry.id,
        _reason: trimmedReason,
      });

      if (error) {
        setFeedback({ type: 'error', message: `Erro ao estornar: ${error.message}` });
        return;
      }

      await fetchSupabaseProducts();
      setFeedback({
        type: 'success',
        message: `${isSaida ? 'Saída de carregamento' : 'Entrada'} [${entry.productCode}] estornada. ${Math.abs(entry.quantity)} caixas devolvidas ao saldo!`,
      });
      setReversalTarget(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Falha ao processar estorno autorizado.' });
    } finally {
      setReversingId(null);
    }
  };

  const categories = ['Todas', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-cyan-400"></span>
              <h1 className="text-2xl font-bold tracking-tight text-white">MARISOFT IA</h1>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-md">
                Estoque Inteligente
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Painel de governança de itens, abastecimento e diagnósticos preditivos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="max-w-[140px] truncate" title={user.email || ''}>
                  {user.email}
                </span>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="ml-2 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Encerrar sessão"
                >
                  Sair
                </button>
              </div>
            )}
            <button
              onClick={() => setIsMovementModalOpen(true)}
              disabled={products.length === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors shadow-lg shadow-emerald-950/40 font-semibold"
            >
              + Registrar Entrada
            </button>
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
            >
              + Novo Produto
            </button>
          </div>
        </header>

        {feedback && (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/70 border-rose-800 text-rose-200'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs underline hover:opacity-80 ml-4"
            >
              Fechar
            </button>
          </div>
        )}

        <MetricsCards products={products} entriesCount={movements.filter(m => m.type === 'entrada').length} />

        <AiAssistant products={products} />

        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('consulta')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'consulta'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Consulta de Estoque
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'historico'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Histórico de Movimentações ({movements.length})
          </button>
        </div>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          {activeTab === 'consulta' ? (
            <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <input
                type="text"
                placeholder="Buscar por nome ou SKU..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {categories.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs text-slate-400">
              Exibindo {filteredProducts.length} de {products.length} itens
            </span>
          </div>

          <InventoryTable
            products={filteredProducts}
            onEdit={prod => {
              setEditingProduct(prod);
              setIsProductModalOpen(true);
            }}
            onDelete={handleDeleteProduct}
          />
            </>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Data/Hora</th>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3 text-right">Total Caixas</th>
                    <th className="px-4 py-3 text-right">Pallets</th>
                    <th className="px-4 py-3 text-right">Avulsas</th>
                    <th className="px-4 py-3">Lote</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Observação</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                        Nenhuma movimentação registrada até o momento.
                      </td>
                    </tr>
                  ) : (
                    movements.map(m => {
                      const isReversed = m.status === 'reversed' || Boolean(m.reversed_at);
                      return (
                        <tr key={m.id} className={`hover:bg-slate-800/40 transition-colors ${isReversed ? 'opacity-60 bg-slate-950/40' : ''}`}>
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">{m.date}</td>
                          <td className="px-4 py-3 font-mono text-xs text-cyan-400 font-semibold">{m.productCode || '-'}</td>
                          <td className="px-4 py-3 text-white font-medium">{m.productName}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${m.type === 'saida' ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {m.type === 'saida' ? '-' : '+'}{m.quantity} cx
                          </td>
                          <td className="px-4 py-3 text-right text-slate-300">{m.pallets ?? 0} plt</td>
                          <td className="px-4 py-3 text-right text-slate-300">{m.loose ?? 0} cx</td>
                          <td className="px-4 py-3 font-mono text-xs text-amber-300">{m.lot || '-'}</td>
                          <td className="px-4 py-3">
                            {isReversed ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800" title={`Estornado em ${m.reversed_at || ''}: ${m.reversal_reason || ''}`}>
                                Estornada
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                Ativa
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 max-w-[200px] truncate" title={isReversed ? `Motivo estorno: ${m.reversal_reason || ''}` : (m.reason || m.notes || '')}>
                            {isReversed ? `[Estornado: ${m.reversal_reason || 'Manual'}]` : (m.reason || m.notes || '-')}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {isReversed ? (
                              <span className="text-xs text-slate-500 font-mono italic">Estornada</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenReversalModal(m)}
                                disabled={reversingId === m.id}
                                className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md text-white transition-colors shadow-sm disabled:opacity-50 ${
                                  m.type === 'saida'
                                    ? 'bg-amber-700 hover:bg-amber-600 border border-amber-500'
                                    : 'bg-rose-800 hover:bg-rose-700 border border-rose-600'
                                }`}
                                title={m.type === 'saida' ? 'Estorno autorizado de saída (devolve ao saldo)' : 'Estornar entrada de estoque'}
                              >
                                {reversingId === m.id ? 'Estornando...' : m.type === 'saida' ? 'Estornar Saída' : 'Estornar'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {isProductModalOpen && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setIsProductModalOpen(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
        />
      )}

      {isMovementModalOpen && products.length > 0 && (
        <StockMovementModal
          products={products}
          onClose={() => setIsMovementModalOpen(false)}
          onSaveMovement={handleSaveMovement}
        />
      )}

      {reversalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${reversalTarget.type === 'saida' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                  {reversalTarget.type === 'saida' ? 'Estorno Autorizado de Saída' : 'Estorno de Entrada de Estoque'}
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  ID: {reversalTarget.id.slice(0, 8)}...
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                O lançamento original será preservado como estornado e uma correção será registrada devolvendo as caixas ao saldo.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Produto:</span><span className="font-semibold text-white">{reversalTarget.productCode} — {reversalTarget.productName}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Tipo Original:</span><span className={`font-semibold ${reversalTarget.type === 'saida' ? 'text-amber-300' : 'text-emerald-300'}`}>{reversalTarget.type === 'saida' ? 'Saída de Carregamento' : 'Entrada em Estoque'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Quantidade Movimentada:</span><span className="font-bold text-white">{Math.abs(reversalTarget.quantity)} caixas ({reversalTarget.pallets ?? 0} plt + {reversalTarget.loose ?? 0} av)</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Data do Lançamento:</span><span className="text-slate-300 font-mono">{reversalTarget.date}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Responsável / Criador:</span><span className="text-slate-300 font-mono">{reversalTarget.created_by ? `${reversalTarget.created_by.slice(0, 8)}...` : (user?.email || 'Autenticado')}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Efeito no Saldo:</span><span className="font-semibold text-emerald-400">{reversalTarget.type === 'saida' ? `+${Math.abs(reversalTarget.quantity)} cx (devolução ao estoque)` : `-${Math.abs(reversalTarget.quantity)} cx (anulação de entrada)`}</span></div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">
                Motivo / Justificativa do Estorno Autorizado *
              </label>
              <textarea
                rows={3}
                value={reversalReasonInput}
                onChange={e => setReversalReasonInput(e.target.value)}
                placeholder="Ex: Carregamento cancelado pela expedição, pedido não faturado..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReversalTarget(null)}
                disabled={Boolean(reversingId)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReversal}
                disabled={Boolean(reversingId) || reversalReasonInput.trim().length < 3}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors disabled:opacity-50 shadow-md"
              >
                {reversingId ? 'Processando estorno...' : 'Confirmar Estorno Autorizado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!authLoading && !user && <AuthModal isOpen={true} />}
    </main>
  );
}
