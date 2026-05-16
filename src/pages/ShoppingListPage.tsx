import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Share2, Printer, Trash2, CheckCircle2, Circle, Plus, X, Mail, MessageCircle, Copy } from 'lucide-react';
import { useStore } from '../store';
import { ShoppingItem } from '../types';

export function ShoppingListPage() {
  const { courses, toggleShoppingItem, deleteShoppingItem, updateShoppingItem, clearShoppingList, clearBoughtItems, addManualShoppingItem } = useStore();
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemUnit, setNewItemUnit] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ nom: '', quantite: 0, unite: '' });
  const [showShareMenu, setShowShareMenu] = useState(false);

  const hasBoughtItems = useMemo(() => courses.some(c => c.achete), [courses]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    addManualShoppingItem({
      nom: newItemName,
      quantite: newItemQty,
      unite: newItemUnit
    });
    setNewItemName('');
    setNewItemQty(1);
    setNewItemUnit('');
  };

  const startEditing = (item: ShoppingItem) => {
    setEditingId(item.id);
    setEditValues({ nom: item.nom, quantite: item.quantite, unite: item.unite });
  };

  const saveEdit = (id: string) => {
    updateShoppingItem(id, editValues);
    setEditingId(null);
  };

  const [showConfirm, setShowConfirm] = useState<{ type: 'bought' | 'all', visible: boolean }>({ type: 'all', visible: false });

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const listHtml = courses
      .map(c => `
        <div style="display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; ${c.achete ? 'color: #999; text-decoration: line-through;' : ''}">
          <div style="width: 20px; height: 20px; border: 2px solid #ccc; border-radius: 4px; margin-right: 12px; ${c.achete ? 'background: #3b82f6; border-color: #3b82f6;' : ''}"></div>
          <div style="flex: 1; font-size: 16px;">${c.nom}</div>
          <div style="font-weight: bold; font-size: 16px;">${c.quantite} ${c.unite}</div>
        </div>
      `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Ma Liste de Courses - BROCOLI</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            p { color: #64748b; margin-bottom: 30px; font-size: 14px; }
            .checkbox { width: 20px; height: 20px; border: 2px solid #ccc; border-radius: 4px; margin-right: 12px; }
            .checkbox.checked { background: #10b981; border-color: #10b981; }
            .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px dashed #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Ma Liste de Courses</h1>
          <p>Générée le ${new Date().toLocaleDateString('fr-FR')} • ${courses.length} articles</p>
          <div>${listHtml}</div>
          <div class="footer">BROCOLI - Receipt App</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getShareText = () => {
    return `🛒 *MA LISTE DE COURSES*\n\n` + 
      courses.map(c => `${c.achete ? '✅' : '⬜'} ${c.quantite}${c.unite ? ' ' + c.unite : ''} - ${c.nom}`).join('\n') +
      `\n\n_Envoyé depuis BROCOLI_`;
  };

  const shareViaEmail = () => {
    const subject = "Ma Liste de Courses";
    const body = getShareText();
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setShowShareMenu(false);
  };

  const shareViaMessenger = async () => {
    const text = getShareText();
    // Facebook Messenger web share link
    window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(window.location.href)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`, '_blank');
    
    // Fallback copy for manual paste
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Copy failed', err);
    }
    setShowShareMenu(false);
  };

  const copyToClipboard = async () => {
    const text = getShareText();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      alert('Liste copiée !');
    } catch (err) {
      // Fallback
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          alert('Liste copiée !');
        } else {
          throw new Error('Fallback failed');
        }
      } catch (fallbackErr) {
        alert('Impossible de copier automatiquement. Veuillez copier manuellement.');
      }
    }
    setShowShareMenu(false);
  };

  const confirmAction = () => {
    if (showConfirm.type === 'bought') clearBoughtItems();
    if (showConfirm.type === 'all') clearShoppingList();
    setShowConfirm({ ...showConfirm, visible: false });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-8 pb-20"
    >
      <AnimatePresence>
        {showShareMenu && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareMenu(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xs space-y-4 overflow-hidden border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-lg">Partager la liste</h3>
                <button onClick={() => setShowShareMenu(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <X size={18} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={shareViaMessenger}
                  className="flex items-center gap-4 p-4 hover:bg-blue-50 rounded-2xl transition-all group text-left border border-transparent hover:border-blue-100"
                >
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    <MessageCircle size={24} fill="currentColor" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">Messenger</p>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Envoyer via Facebook</p>
                  </div>
                </button>

                <button 
                  onClick={shareViaEmail}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all group text-left border border-transparent hover:border-slate-100"
                >
                  <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    <Mail size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">E-mail</p>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Partager par courriel</p>
                  </div>
                </button>

                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all group text-left border border-transparent hover:border-slate-100"
                >
                  <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    <Copy size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">Copier le texte</p>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Prese-papier</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showConfirm.visible && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm({ ...showConfirm, visible: false })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Êtes-vous sûr ?</h3>
                <p className="text-slate-500 mt-2">
                  {showConfirm.type === 'bought' 
                    ? 'Cette action supprimera tous les articles cochés de votre liste.' 
                    : 'Cette action videra complètement votre liste de courses.'}
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirm({ ...showConfirm, visible: false })}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmAction}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                >
                  Confirmer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Ma Liste de Courses</h2>
          <p className="text-sm text-slate-500">
            {courses.length} articles au total — {courses.filter(c => c.achete).length} achetés
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasBoughtItems && (
            <button 
              onClick={() => setShowConfirm({ type: 'bought', visible: true })}
              className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100 shadow-sm"
              title="Nettoyer les articles achetés"
            >
              <CheckCircle2 size={18} />
            </button>
          )}
          <button 
            onClick={() => setShowShareMenu(true)}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            title="Partager"
          >
            <Share2 size={18} />
          </button>
          <button 
            onClick={handlePrint}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            title="Imprimer"
          >
            <Printer size={18} />
          </button>
          <button 
            type="button"
            onClick={() => setShowConfirm({ type: 'all', visible: true })}
            className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition-colors shadow-sm"
            title="Tout effacer"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <form onSubmit={handleAddItem} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 md:items-end mb-10 transition-all">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Article</label>
          <input 
            type="text" 
            placeholder="Ajouter un article (ex: Pommes)..."
            value={newItemName || ''}
            onChange={(e) => setNewItemName(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
          />
        </div>
        <div className="w-24">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Qté</label>
          <input 
            type="number" 
            step="any"
            value={newItemQty ?? 1}
            onChange={(e) => setNewItemQty(parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
          />
        </div>
        <div className="w-28">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Unité</label>
          <input 
            type="text" 
            placeholder="g, kg, pces..."
            value={newItemUnit || ''}
            onChange={(e) => setNewItemUnit(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
          />
        </div>
        <button 
          type="submit"
          disabled={!newItemName.trim()}
          className="btn-primary py-2.5"
        >
          <Plus size={18} />
          <span>Ajouter</span>
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-12">
        {courses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-12 text-center">État</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Article</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Quantité</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {courses.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`group transition-colors ${item.achete ? 'bg-slate-50/40' : 'hover:bg-slate-50/60'}`}
                  >
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => toggleShoppingItem(item.id)}
                        className={`transition-colors flex justify-center w-full ${item.achete ? 'text-emerald-500' : 'text-slate-200 hover:text-slate-400'}`}
                        title={item.achete ? 'Marquer comme non acheté' : 'Marquer comme acheté'}
                      >
                        {item.achete ? <CheckCircle2 size={22} strokeWidth={2.5} /> : <Circle size={22} strokeWidth={2.5} />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {editingId === item.id ? (
                        <input 
                          autoFocus
                          type="text"
                          value={editValues.nom || ''}
                          onChange={e => setEditValues({ ...editValues, nom: e.target.value })}
                          className="w-full px-2 py-1 bg-white border border-emerald-300 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                          onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)}
                          onBlur={() => saveEdit(item.id)}
                        />
                      ) : (
                        <span 
                          onClick={() => !item.achete && startEditing(item)}
                          className={`text-sm tracking-tight transition-all font-medium cursor-pointer ${item.achete ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                        >
                          {item.nom}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId === item.id ? (
                        <div className="flex justify-end gap-1">
                          <input 
                            type="number"
                            step="any"
                            value={editValues.quantite ?? 0}
                            onChange={e => setEditValues({ ...editValues, quantite: parseFloat(e.target.value) || 0 })}
                            className="w-16 px-1 py-1 bg-white border border-emerald-300 rounded text-xs text-right outline-none"
                          />
                          <input 
                            type="text"
                            value={editValues.unite || ''}
                            onChange={e => setEditValues({ ...editValues, unite: e.target.value })}
                            className="w-12 px-1 py-1 bg-white border border-emerald-300 rounded text-xs outline-none"
                          />
                        </div>
                      ) : (
                        <span 
                          onClick={() => !item.achete && startEditing(item)}
                          className={`text-sm font-semibold cursor-pointer ${item.achete ? 'text-slate-400' : 'text-slate-500'}`}
                        >
                          {item.quantite} {item.unite}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        {editingId === item.id ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); saveEdit(item.id); }} 
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); startEditing(item); }}
                              className="p-1.5 text-slate-300 hover:text-emerald-600 sm:opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                              title="Modifier"
                            >
                              <Plus size={16} className="rotate-45" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteShoppingItem(item.id); }}
                              className="p-1.5 text-slate-300 hover:text-red-500 sm:opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-24 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <ShoppingCart className="text-slate-300" size={32} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 tracking-tight">Votre panier est vide</p>
              <p className="text-sm text-slate-400">Ajoutez des ingrédients pour commencer.</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl shadow-slate-900/10">
          <h4 className="text-lg font-bold mb-3 tracking-tight">Astuce Minimalism</h4>
          <p className="text-slate-400 leading-relaxed text-sm font-medium">
            Centralisez vos besoins alimentaires sur une seule liste partagée pour réduire le gaspillage et gagner du temps lors de vos courses.
          </p>
        </div>
        <div className="card p-8 flex flex-col justify-center">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Résumé des courses</h4>
          <div className="flex items-center gap-6">
            <div className="text-5xl font-bold tracking-tighter text-emerald-600">{courses.length}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider space-y-1">
              <p>Restant : <span className="text-slate-900 font-black">{courses.filter(c => !c.achete).length}</span></p>
              <p>Acheté : <span className="text-slate-900 font-black">{courses.filter(c => c.achete).length}</span></p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
