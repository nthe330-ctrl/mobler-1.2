import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Award, 
  Flame, 
  Crown, 
  Heart, 
  Calendar, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles, 
  DollarSign, 
  Coffee, 
  TrendingUp, 
  ArrowUpRight, 
  Filter, 
  Gift, 
  ShoppingBag, 
  X,
  Star,
  Tag
} from 'lucide-react';
import { http } from '../../services/shopApi';
import { useShopAuth } from '../../context/ShopAuthContext';
import { Customer } from '../../types/dashboard';
import CustomerAvatar from './CustomerAvatar';
import { useMoney } from '../../hooks/useMoney';

export default function CustomerInsightsView() {
  const { money } = useMoney();
  // Built only from this shop's real bookings & orders — empty for a new shop.
  const { activeShop } = useShopAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  useEffect(() => {
    if (!activeShop) return;
    setLoadingCustomers(true);
    http
      .get<{ customers: Customer[] }>(`/merchant/shops/${activeShop.id}/customers`)
      .then(r => setCustomers(r.customers.map(c => ({ ...c, joinDate: c.joinDate ? new Date(c.joinDate).toLocaleDateString('vi-VN') : '—', lastVisit: c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('vi-VN') : 'Chưa đến quán' }))))
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false));
  }, [activeShop?.id]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMilestone, setSelectedMilestone] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredCustomers = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchMilestone = selectedMilestone === 'all' || 
      (selectedMilestone === 'new' && c.visitCount <= 3) ||
      (selectedMilestone === 'explorer' && c.visitCount >= 4 && c.visitCount <= 9) ||
      (selectedMilestone === 'connoisseur' && c.visitCount >= 10 && c.visitCount <= 24) ||
      (selectedMilestone === 'legend' && c.visitCount >= 25);

    return matchSearch && matchMilestone;
  });

  const totalMembers = customers.length;
  const vipCount = customers.filter(c => c.visitCount >= 10).length;
  const totalRevenue = customers.reduce((acc, c) => acc + c.totalSpent, 0);
  const totalPoints = customers.reduce((acc, c) => acc + c.points, 0);

  const getMilestoneBadge = (visitCount: number) => {
    if (visitCount >= 25) {
      return (
        <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-lg border border-amber-300 shadow-xs flex items-center gap-1">
          <Crown size={12} className="fill-slate-950" />
          <span>Huyền Thoại (25+)</span>
        </span>
      );
    }
    if (visitCount >= 10) {
      return (
        <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-purple-300 flex items-center gap-1">
          <Award size={12} />
          <span>Chuyên Gia (10+)</span>
        </span>
      );
    }
    if (visitCount >= 4) {
      return (
        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-blue-300 flex items-center gap-1">
          <Sparkles size={12} />
          <span>Thám Hiểm (4-9)</span>
        </span>
      );
    }
    return (
      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1">
        <span>🌱</span>
        <span>Lính Mới (1-3)</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[110] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-extrabold text-gray-900">Quản lý Khách hàng & Thành viên</h2>
            <span className="bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1 rounded-full border border-purple-200 flex items-center gap-1.5">
              <Users size={14} />
              <span>{totalMembers} khách lưu trữ</span>
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Theo dõi phân cấp cột mốc khách hàng (Lính mới, Thám hiểm gia, Chuyên gia, Huyền thoại), lịch sử ghé quán và điểm tích lũy.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Tổng thành viên</p>
            <p className="text-xl font-black text-gray-900">{totalMembers} khách</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Crown size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Khách VIP & Thân thiết</p>
            <p className="text-xl font-black text-amber-600">{vipCount} khách</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Doanh số từ hội viên</p>
            <p className="text-xl font-black text-gray-900">{(totalRevenue / 1000000).toFixed(1)}Tr đ</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Gift size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Điểm tích lũy chưa đổi</p>
            <p className="text-xl font-black text-blue-600">{totalPoints.toLocaleString()} pts</p>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo tên khách, số điện thoại, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-sm transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
            <span className="text-gray-400 font-semibold shrink-0 mr-1">Cột mốc:</span>
            {[
              { key: 'all', label: 'Tất cả', count: customers.length },
              { key: 'legend', label: '👑 Huyền thoại (25+)', count: customers.filter(c => c.visitCount >= 25).length },
              { key: 'connoisseur', label: '🎓 Chuyên gia (10-24)', count: customers.filter(c => c.visitCount >= 10 && c.visitCount < 25).length },
              { key: 'explorer', label: '🧭 Thám hiểm (4-9)', count: customers.filter(c => c.visitCount >= 4 && c.visitCount < 10).length },
              { key: 'new', label: '🌱 Lính mới (1-3)', count: customers.filter(c => c.visitCount <= 3).length },
            ].map(m => {
              const isActive = selectedMilestone === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setSelectedMilestone(m.key)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  <span>{m.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {m.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Customer List / Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold text-xs">
                <th className="py-3.5 pl-5">Khách hàng & Cột mốc</th>
                <th className="py-3.5">Liên hệ</th>
                <th className="py-3.5 text-center">Số lần ghé</th>
                <th className="py-3.5">Tổng chi tiêu</th>
                <th className="py-3.5">Điểm thưởng</th>
                <th className="py-3.5">Món ưa thích</th>
                <th className="py-3.5">Lần cuối ghé</th>
                <th className="py-3.5 text-right pr-5">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-gray-500">
                    {loadingCustomers ? 'Đang tải…' : customers.length === 0 ? 'Chưa có khách hàng nào. Khách đặt bàn hoặc gọi món tại quán sẽ xuất hiện ở đây.' : 'Không có khách hàng khớp bộ lọc.'}
                  </td>
                </tr>
              )}
              {filteredCustomers.map(customer => (
                <tr 
                  key={customer.id} 
                  onClick={() => setSelectedCustomer(customer)}
                  className="transition-colors hover:bg-purple-50/30 cursor-pointer group"
                >
                  <td className="py-4 pl-5">
                    <div className="flex items-center space-x-3">
                      <CustomerAvatar 
                        name={customer.name} 
                        src={customer.avatar} 
                        size="md"
                      />
                      <div>
                        <p className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                          {customer.name}
                        </p>
                        <div className="mt-1">
                          {getMilestoneBadge(customer.visitCount)}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 text-xs text-gray-600 space-y-0.5">
                    <p className="font-semibold text-gray-800 flex items-center gap-1">
                      <Phone size={12} className="text-gray-400" />
                      <span>{customer.phone}</span>
                    </p>
                    {customer.email && (
                      <p className="text-gray-400 flex items-center gap-1">
                        <Mail size={12} />
                        <span>{customer.email}</span>
                      </p>
                    )}
                  </td>

                  <td className="py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-900 font-black text-xs">
                      {customer.visitCount}
                    </span>
                  </td>

                  <td className="py-4 font-bold text-gray-900">
                    <span className="text-emerald-700">{money(customer.totalSpent)}</span>
                  </td>

                  <td className="py-4 font-bold text-purple-700">
                    <span>{customer.points.toLocaleString()} pts</span>
                  </td>

                  <td className="py-4 text-xs">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {customer.favoriteItems.map((fav, i) => (
                        <span key={i} className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-semibold truncate">
                          {fav}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-4 text-xs text-gray-500">
                    {customer.lastVisit}
                  </td>

                  <td className="py-4 text-right pr-5">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomer(customer);
                      }}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-gray-900/75 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3.5">
                <CustomerAvatar 
                  name={selectedCustomer.name} 
                  src={selectedCustomer.avatar} 
                  size="lg"
                />
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">{selectedCustomer.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    {getMilestoneBadge(selectedCustomer.visitCount)}
                    <span className="text-xs text-gray-400 font-mono">ID: {selectedCustomer.id}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs">
              <div>
                <span className="text-gray-400 block font-medium">Số điện thoại:</span>
                <span className="font-bold text-gray-900">{selectedCustomer.phone}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Email:</span>
                <span className="font-bold text-gray-900">{selectedCustomer.email || 'Chưa cung cấp'}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Lần đầu ghé quán:</span>
                <span className="font-bold text-gray-900">{selectedCustomer.joinDate}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Ghé gần nhất:</span>
                <span className="font-bold text-gray-900">{selectedCustomer.lastVisit}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-purple-50 p-3.5 rounded-2xl border border-purple-200 text-center">
                <p className="text-[11px] text-purple-700 font-semibold">Số lần đến</p>
                <p className="text-2xl font-black text-purple-900 mt-0.5">{selectedCustomer.visitCount}</p>
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-center">
                <p className="text-[11px] text-emerald-700 font-semibold">Tổng chi tiêu</p>
                <p className="text-lg font-black text-emerald-900 mt-1">{(selectedCustomer.totalSpent / 1000).toLocaleString()}k</p>
              </div>

              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-center">
                <p className="text-[11px] text-amber-700 font-semibold">Điểm tích lũy</p>
                <p className="text-2xl font-black text-amber-900 mt-0.5">{selectedCustomer.points}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Coffee size={14} className="text-red-600" />
                <span>Món đồ uống & Món ăn yêu thích:</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedCustomer.favoriteItems.map((fav, idx) => (
                  <span key={idx} className="bg-red-50 text-red-700 border border-red-200 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center space-x-1">
                    <Star size={12} className="fill-red-600" />
                    <span>{fav}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  triggerToast(`Đã tặng voucher ưu đãi riêng cho ${selectedCustomer.name}!`);
                  setSelectedCustomer(null);
                }}
                className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold py-2.5 rounded-xl shadow-md shadow-red-600/20 text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Gift size={15} />
                <span>Tặng Voucher Riêng Cho Khách</span>
              </button>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
