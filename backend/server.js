const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const os = require('os');
const cors = require('cors');

const execPromise = util.promisify(exec);
const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

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

// 检测操作系统
const platform = os.platform();

/**
 * 检查单个端口状态
 */
async function checkPort(port) {
    try {
        let command;

        if (platform === 'win32') {
            // Windows: 使用 netstat
            command = `netstat -ano | findstr :${port}`;
        } else {
            // macOS/Linux: 使用 lsof
            command = `lsof -i :${port} -sTCP:LISTEN -t`;
        }

        const { stdout, stderr } = await execPromise(command);

        if (platform === 'win32') {
            // Windows 解析
            const lines = stdout.trim().split('\n');
            if (lines.length > 0 && lines[0]) {
                const parts = lines[0].trim().split(/\s+/);
                const pid = parts[parts.length - 1];

                // 获取进程名称
                try {
                    const { stdout: tasklistOutput } = await execPromise(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
                    const processName = tasklistOutput.split(',')[0].replace(/"/g, '');
                    return { occupied: true, pid: parseInt(pid), process: processName };
                } catch {
                    return { occupied: true, pid: parseInt(pid), process: 'unknown' };
                }
            }
        } else {
            // macOS/Linux 解析
            const pid = stdout.trim();
            if (pid) {
                // 获取进程名称
                try {
                    const { stdout: psOutput } = await execPromise(`ps -p ${pid} -o comm=`);
                    const processName = psOutput.trim();
                    return { occupied: true, pid: parseInt(pid), process: processName };
                } catch {
                    return { occupied: true, pid: parseInt(pid), process: 'unknown' };
                }
            }
        }

        return { occupied: false, pid: null, process: null };
    } catch (error) {
        // 命令执行失败通常意味着端口未被占用
        return { occupied: false, pid: null, process: null };
    }
}

/**
 * 终止指定端口的进程
 */
async function killPortProcess(port) {
    try {
        let command;

        if (platform === 'win32') {
            // Windows: 先找到PID,再使用taskkill
            const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
            const lines = stdout.trim().split('\n');
            if (lines.length > 0 && lines[0]) {
                const parts = lines[0].trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                command = `taskkill /PID ${pid} /F`;
            } else {
                return { success: false, message: '未找到占用该端口的进程' };
            }
        } else {
            // macOS/Linux: 使用lsof找到PID,再使用kill
            const { stdout } = await execPromise(`lsof -i :${port} -sTCP:LISTEN -t`);
            const pid = stdout.trim();
            if (pid) {
                command = `kill -9 ${pid}`;
            } else {
                return { success: false, message: '未找到占用该端口的进程' };
            }
        }

        await execPromise(command);
        return { success: true, message: `成功终止端口 ${port} 的进程` };
    } catch (error) {
        return { success: false, message: `终止进程失败: ${error.message}` };
    }
}

/**
 * API路由: 获取所有端口状态
 */
app.get('/api/ports', async (req, res) => {
    try {
        const portPromises = COMMON_PORTS.map(async (portInfo) => {
            const status = await checkPort(portInfo.port);
            return {
                ...portInfo,
                ...status,
            };
        });

        const ports = await Promise.all(portPromises);

        res.json({
            success: true,
            platform: platform,
            timestamp: new Date().toISOString(),
            ports: ports,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取端口状态失败',
            error: error.message,
        });
    }
});

/**
 * API路由: 终止指定端口的进程
 */
app.post('/api/kill/:port', async (req, res) => {
    try {
        const port = parseInt(req.params.port);

        if (isNaN(port) || port < 1 || port > 65535) {
            return res.status(400).json({
                success: false,
                message: '无效的端口号',
            });
        }

        const result = await killPortProcess(port);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                port: port,
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.message,
                port: port,
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '终止进程失败',
            error: error.message,
        });
    }
});

/**
 * API路由: 健康检查
 */
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Ponitor API is running',
        platform: platform,
        timestamp: new Date().toISOString(),
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`Ponitor API Server`);
    console.log(`=================================`);
    console.log(`Platform: ${platform}`);
    console.log(`Server running on port ${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  GET  /api/health`);
    console.log(`  GET  /api/ports`);
    console.log(`  POST /api/kill/:port`);
    console.log(`=================================`);
});