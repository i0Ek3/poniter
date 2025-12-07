import React, { useState, useEffect } from 'react';
import { Terminal, Wifi, WifiOff, X, RefreshCw, Moon, Sun, Filter, ArrowUpDown } from 'lucide-react';

const PortMonitor = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('port');
  const [sortOrder, setSortOrder] = useState('asc');

  // 常用端口定义
  const COMMON_PORTS = [
    { port: 80, name: 'HTTP', category: 'web', description: 'Web服务器' },
    { port: 443, name: 'HTTPS', category: 'web', description: 'SSL/TLS Web服务器' },
    { port: 3000, name: 'Node.js Dev', category: 'development', description: '开发服务器' },
    { port: 3306, name: 'MySQL', category: 'database', description: 'MySQL数据库' },
    { port: 5432, name: 'PostgreSQL', category: 'database', description: 'PostgreSQL数据库' },
    { port: 6379, name: 'Redis', category: 'database', description: 'Redis缓存' },
    { port: 27017, name: 'MongoDB', category: 'database', description: 'MongoDB数据库' },
    { port: 8080, name: 'HTTP Alt', category: 'web', description: '备用Web服务器' },
    { port: 9000, name: 'PHP-FPM', category: 'development', description: 'PHP FastCGI' },
    { port: 5000, name: 'Flask/Custom', category: 'development', description: 'Python Flask' },
    { port: 8000, name: 'Django', category: 'development', description: 'Python Django' },
    { port: 4200, name: 'Angular', category: 'development', description: 'Angular开发服务器' },
    { port: 5173, name: 'Vite', category: 'development', description: 'Vite开发服务器' },
    { port: 22, name: 'SSH', category: 'system', description: 'SSH远程连接' },
    { port: 21, name: 'FTP', category: 'system', description: 'FTP文件传输' },
    { port: 3389, name: 'RDP', category: 'system', description: 'Windows远程桌面' },
  ];

  // API基础URL (部署时修改为实际后端地址)
  const API_BASE = '/api';

  // 从后端获取端口状态
  const fetchPortStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/ports`);
      if (response.ok) {
        const data = await response.json();
        setPorts(data.ports);
        setLastUpdate(new Date());
      } else {
        // 后端不可用时使用模拟数据
        simulatePortCheck();
      }
    } catch (error) {
      console.error('获取端口状态失败,使用模拟数据:', error);
      simulatePortCheck();
    } finally {
      setLoading(false);
    }
  };

  // 模拟端口检测(后端不可用时的降级方案)
  const simulatePortCheck = () => {
    const checkedPorts = COMMON_PORTS.map(portInfo => ({
      ...portInfo,
      occupied: Math.random() > 0.6,
      pid: Math.random() > 0.6 ? Math.floor(Math.random() * 10000) + 1000 : null,
      process: Math.random() > 0.6 ? ['node', 'nginx', 'mysql', 'postgres', 'redis-server', 'mongod'][Math.floor(Math.random() * 6)] : null,
    }));
    setPorts(checkedPorts);
    setLastUpdate(new Date());
  };

  useEffect(() => {
    fetchPortStatus();
  }, []);

  const handleKillPort = async (port) => {
    if (!window.confirm(`确定要终止端口 ${port} 上的进程吗?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/kill/${port}`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[系统] ${result.message}`);
        // 刷新端口状态
        setTimeout(() => fetchPortStatus(), 500);
      } else {
        // 降级到前端模拟
        setPorts(ports.map(p =>
          p.port === port ? { ...p, occupied: false, pid: null, process: null } : p
        ));
        console.log(`[系统] 已发送终止命令到端口 ${port}`);
      }
    } catch (error) {
      console.error('终止进程失败:', error);
      alert('终止进程失败,请检查后端连接');
    }
  };

  // 筛选和排序逻辑
  const getFilteredAndSortedPorts = () => {
    let filtered = [...ports];

    // 按分类筛选
    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => p.category === filterCategory);
    }

    // 按状态筛选
    if (filterStatus === 'occupied') {
      filtered = filtered.filter(p => p.occupied);
    } else if (filterStatus === 'free') {
      filtered = filtered.filter(p => !p.occupied);
    }

    // 排序
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'port':
          compareValue = a.port - b.port;
          break;
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'category':
          compareValue = a.category.localeCompare(b.category);
          break;
        case 'status':
          compareValue = (a.occupied ? 1 : 0) - (b.occupied ? 1 : 0);
          break;
        default:
          compareValue = 0;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      web: darkMode ? 'text-green-400' : 'text-green-600',
      database: darkMode ? 'text-blue-400' : 'text-blue-600',
      development: darkMode ? 'text-purple-400' : 'text-purple-600',
      system: darkMode ? 'text-yellow-400' : 'text-yellow-600',
    };
    return colors[category] || (darkMode ? 'text-gray-400' : 'text-gray-600');
  };

  // 统计数据
  const stats = {
    total: ports.length,
    occupied: ports.filter(p => p.occupied).length,
    free: ports.filter(p => !p.occupied).length,
    web: ports.filter(p => p.category === 'web' && p.occupied).length,
    database: ports.filter(p => p.category === 'database' && p.occupied).length,
    development: ports.filter(p => p.category === 'development' && p.occupied).length,
    system: ports.filter(p => p.category === 'system' && p.occupied).length,
  };

  const bgClass = darkMode ? 'bg-black' : 'bg-white';
  const textClass = darkMode ? 'text-green-400' : 'text-gray-800';
  const borderClass = darkMode ? 'border-green-500' : 'border-gray-300';
  const cardBgClass = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const secondaryTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';

  const filteredPorts = getFilteredAndSortedPorts();

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} font-mono p-6 transition-colors duration-300`}>
      {/* 头部 */}
      <div className={`border ${borderClass} p-4 mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6" />
            <h1 className="text-2xl font-bold">PONITOR v1.0.0</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 border ${borderClass} hover:bg-opacity-20 ${darkMode ? 'hover:bg-green-500' : 'hover:bg-gray-300'} transition-colors`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={fetchPortStatus}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 border ${borderClass} hover:bg-opacity-20 ${darkMode ? 'hover:bg-green-500' : 'hover:bg-gray-300'} transition-colors disabled:opacity-50`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </div>

        <div className={`${secondaryTextClass} text-sm space-y-1`}>
          <div>系统: {navigator.platform}</div>
          <div>最后更新: {lastUpdate.toLocaleString('zh-CN')}</div>
        </div>
      </div>

      {/* 统一的统计卡片 */}
      <div className={`border ${borderClass} ${cardBgClass} p-6 mb-6`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className={`text-xs ${secondaryTextClass} uppercase mb-2`}>总端口数</div>
            <div className="text-3xl font-bold">{stats.total}</div>
          </div>
          <div>
            <div className={`text-xs ${secondaryTextClass} uppercase mb-2`}>占用中</div>
            <div className="text-3xl font-bold text-red-500">{stats.occupied}</div>
          </div>
          <div>
            <div className={`text-xs ${secondaryTextClass} uppercase mb-2`}>空闲</div>
            <div className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{stats.free}</div>
          </div>
          <div>
            <div className={`text-xs ${secondaryTextClass} uppercase mb-2`}>分类占用</div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-green-400">WEB</span>
                <span className="font-bold">{stats.web}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">DATABASE</span>
                <span className="font-bold">{stats.database}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-400">DEVELOPMENT</span>
                <span className="font-bold">{stats.development}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-400">SYSTEM</span>
                <span className="font-bold">{stats.system}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选和排序控制 */}
      <div className={`border ${borderClass} ${cardBgClass} p-4 mb-6`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-bold">筛选:</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs">分类:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={`${cardBgClass} ${textClass} border ${borderClass} px-3 py-1 text-sm`}
            >
              <option value="all">全部</option>
              <option value="web">WEB</option>
              <option value="database">DATABASE</option>
              <option value="development">DEVELOPMENT</option>
              <option value="system">SYSTEM</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs">状态:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`${cardBgClass} ${textClass} border ${borderClass} px-3 py-1 text-sm`}
            >
              <option value="all">全部</option>
              <option value="occupied">占用中</option>
              <option value="free">空闲</option>
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <ArrowUpDown className="w-4 h-4" />
            <span className="text-sm font-bold">排序:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`${cardBgClass} ${textClass} border ${borderClass} px-3 py-1 text-sm`}
            >
              <option value="port">端口号</option>
              <option value="name">服务名称</option>
              <option value="category">分类</option>
              <option value="status">状态</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={`px-3 py-1 border ${borderClass} text-sm hover:bg-opacity-20 ${darkMode ? 'hover:bg-green-500' : 'hover:bg-gray-300'}`}
            >
              {sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
            </button>
          </div>
        </div>

        <div className={`mt-3 text-xs ${secondaryTextClass}`}>
          显示 {filteredPorts.length} / {ports.length} 个端口
        </div>
      </div>

      {/* 端口列表 */}
      <div className={`border ${borderClass}`}>
        <div className={`${cardBgClass} p-3 border-b ${borderClass} font-bold grid grid-cols-12 gap-4 text-sm`}>
          <div className="col-span-1 cursor-pointer" onClick={() => toggleSort('port')}>
            端口 {sortBy === 'port' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
          <div className="col-span-2 cursor-pointer" onClick={() => toggleSort('name')}>
            服务名称 {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
          <div className="col-span-2 cursor-pointer" onClick={() => toggleSort('category')}>
            分类 {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
          <div className="col-span-3">描述</div>
          <div className="col-span-2 cursor-pointer" onClick={() => toggleSort('status')}>
            状态 {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
          <div className="col-span-2">操作</div>
        </div>

        <div className="divide-y divide-gray-700">
          {filteredPorts.length === 0 ? (
            <div className={`p-8 text-center ${secondaryTextClass}`}>
              未找到符合条件的端口
            </div>
          ) : (
            filteredPorts.map((portInfo) => (
              <div
                key={portInfo.port}
                className={`p-3 grid grid-cols-12 gap-4 items-center text-sm hover:bg-opacity-10 ${darkMode ? 'hover:bg-green-500' : 'hover:bg-gray-300'} transition-colors`}
              >
                <div className="col-span-1 font-bold">{portInfo.port}</div>
                <div className="col-span-2">{portInfo.name}</div>
                <div className={`col-span-2 ${getCategoryColor(portInfo.category)} uppercase text-xs`}>
                  {portInfo.category}
                </div>
                <div className={`col-span-3 ${secondaryTextClass}`}>{portInfo.description}</div>
                <div className="col-span-2 flex items-center gap-2">
                  {portInfo.occupied ? (
                    <>
                      <Wifi className="w-4 h-4 text-red-500" />
                      <span className="text-red-500">占用中</span>
                      {portInfo.pid && (
                        <span className={`text-xs ${secondaryTextClass}`}>
                          (PID: {portInfo.pid})
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <WifiOff className={`w-4 h-4 ${secondaryTextClass}`} />
                      <span className={secondaryTextClass}>空闲</span>
                    </>
                  )}
                </div>
                <div className="col-span-2">
                  <button
                    onClick={() => handleKillPort(portInfo.port)}
                    disabled={!portInfo.occupied}
                    className={`flex items-center gap-2 px-3 py-1 border ${borderClass} text-xs transition-colors ${portInfo.occupied
                      ? `hover:bg-red-500 hover:border-red-500 hover:text-white`
                      : 'opacity-30 cursor-not-allowed'
                      }`}
                  >
                    <X className="w-3 h-3" />
                    终止进程
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 底部信息 */}
      <div className={`mt-6 p-4 border ${borderClass} ${secondaryTextClass} text-xs space-y-2`}>
        <div>API端点: {API_BASE}/ports (GET) | {API_BASE}/kill/:port (POST)</div>
        <div>后端技术: Node.js + Express + child_process</div>
        <div>部署说明: 前端可部署到 Vercel/Netlify, 后端部署到 VPS/云服务器</div>
      </div>
    </div>
  );
};

export default PortMonitor;