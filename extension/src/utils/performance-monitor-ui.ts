import * as vscode from 'vscode';
import { globalPerformanceMonitor, globalCache, globalDebouncer } from './performance-cache';

export interface PerformanceReport {
  generalStats: {
    averageSearchTime: number;
    averageUpdateTime: number;
    averageAnalysisTime: number;
    cacheHitRate: number;
    memoryUsage: number;
  };
  detailedStats: { [operation: string]: any };
  cacheStats: any;
  recommendations: string[];
}

export class PerformanceMonitorUI {
  private static instance: PerformanceMonitorUI;
  private statusBarItem: vscode.StatusBarItem;
  private isMonitoringEnabled = true;
  private performanceData: { [key: string]: number[] } = {};

  private constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'openapi-enhanced.showPerformanceReport';
    this.updateStatusBar();
  }

  static getInstance(): PerformanceMonitorUI {
    if (!PerformanceMonitorUI.instance) {
      PerformanceMonitorUI.instance = new PerformanceMonitorUI();
    }
    return PerformanceMonitorUI.instance;
  }

  enable(): void {
    this.isMonitoringEnabled = true;
    this.statusBarItem.show();
    this.updateStatusBar();
  }

  disable(): void {
    this.isMonitoringEnabled = false;
    this.statusBarItem.hide();
  }

  private updateStatusBar(): void {
    if (!this.isMonitoringEnabled) return;

    const searchStats = globalPerformanceMonitor.getStats('searchEndpoints');
    const updateStats = globalPerformanceMonitor.getStats('updateView');
    const cacheStats = globalCache.getCacheStats();

    if (searchStats || updateStats) {
      const avgSearchTime = searchStats?.average || 0;
      const avgUpdateTime = updateStats?.average || 0;
      const hitRate = (cacheStats.search.hitRate * 100).toFixed(1);

      this.statusBarItem.text = `$(pulse) API: ${avgSearchTime.toFixed(1)}ms | Cache: ${hitRate}%`;
      this.statusBarItem.tooltip = 'Click to view detailed performance metrics';
    } else {
      this.statusBarItem.text = `$(pulse) API Performance`;
      this.statusBarItem.tooltip = 'Click to view performance metrics';
    }
  }

  generateReport(): PerformanceReport {
    const allStats = globalPerformanceMonitor.getAllStats();
    const cacheStats = globalCache.getCacheStats();
    
    // Calculate general statistics
    const searchStats = allStats['searchEndpoints'];
    const updateStats = allStats['updateView'];
    const analysisStats = allStats['analyzeSpec'];

    const generalStats = {
      averageSearchTime: searchStats?.average || 0,
      averageUpdateTime: updateStats?.average || 0,
      averageAnalysisTime: analysisStats?.average || 0,
      cacheHitRate: (cacheStats.search.hitRate + cacheStats.filter.hitRate + cacheStats.group.hitRate) / 3,
      memoryUsage: cacheStats.search.memoryUsage + cacheStats.filter.memoryUsage + cacheStats.group.memoryUsage
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(generalStats, allStats, cacheStats);

    return {
      generalStats,
      detailedStats: allStats,
      cacheStats,
      recommendations
    };
  }

  private generateRecommendations(generalStats: any, detailedStats: any, cacheStats: any): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (generalStats.averageSearchTime > 100) {
      recommendations.push('Search performance is slow. Consider enabling lazy loading for large datasets.');
    }

    if (generalStats.averageUpdateTime > 50) {
      recommendations.push('UI updates are slow. Consider increasing debounce delay or optimizing rendering.');
    }

    if (generalStats.cacheHitRate < 0.7) {
      recommendations.push('Cache hit rate is low. Consider increasing cache size or adjusting cache TTL.');
    }

    if (generalStats.memoryUsage > 10 * 1024 * 1024) { // 10MB
      recommendations.push('High memory usage detected. Consider reducing cache size or implementing memory cleanup.');
    }

    // Cache-specific recommendations
    if (cacheStats.search.totalEntries > 40) {
      recommendations.push('Search cache is full. Consider clearing old entries or increasing cache size.');
    }

    // Debouncer recommendations
    if (globalDebouncer.getPendingCount() > 5) {
      recommendations.push('Many pending operations detected. Consider optimizing update frequency.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal! 🚀');
    }

    return recommendations;
  }

  async showReport(): Promise<void> {
    const report = this.generateReport();
    
    const panel = vscode.window.createWebviewPanel(
      'performanceReport',
      'OpenAPI Enhanced - Performance Report',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = this.getReportHTML(report);

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case 'clearCache':
          globalCache.invalidateAll();
          globalPerformanceMonitor.clear();
          vscode.window.showInformationMessage('Performance data cleared');
          panel.webview.html = this.getReportHTML(this.generateReport());
          break;
        case 'exportReport':
          this.exportReport(report);
          break;
        case 'refresh':
          panel.webview.html = this.getReportHTML(this.generateReport());
          break;
      }
    });
  }

  private getReportHTML(report: PerformanceReport): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Performance Report</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
                line-height: 1.6;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .section {
                margin-bottom: 30px;
                padding: 20px;
                background-color: var(--vscode-editor-inactiveSelectionBackground);
                border-radius: 8px;
            }
            .metric {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                padding: 8px 0;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .metric:last-child {
                border-bottom: none;
            }
            .metric-label {
                font-weight: bold;
            }
            .metric-value {
                color: var(--vscode-textLink-foreground);
            }
            .recommendations {
                background-color: var(--vscode-editorInfo-background);
                border-left: 4px solid var(--vscode-textLink-foreground);
                padding: 15px;
                margin: 20px 0;
            }
            .recommendation {
                margin-bottom: 8px;
            }
            .recommendation:last-child {
                margin-bottom: 0;
            }
            .buttons {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }
            button {
                padding: 8px 16px;
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            .details {
                margin-top: 20px;
            }
            .expandable {
                cursor: pointer;
                user-select: none;
            }
            .expandable:hover {
                background-color: var(--vscode-list-hoverBackground);
            }
            .details-content {
                display: none;
                margin-top: 10px;
                padding-left: 20px;
            }
            .cache-section {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            .cache-item {
                background-color: var(--vscode-input-background);
                padding: 15px;
                border-radius: 4px;
                border: 1px solid var(--vscode-input-border);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 Performance Report</h1>
                <p>OpenAPI Enhanced Extension Performance Metrics</p>
            </div>

            <div class="section">
                <h2>📊 General Performance</h2>
                <div class="metric">
                    <span class="metric-label">Average Search Time</span>
                    <span class="metric-value">${report.generalStats.averageSearchTime.toFixed(2)}ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Average Update Time</span>
                    <span class="metric-value">${report.generalStats.averageUpdateTime.toFixed(2)}ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Average Analysis Time</span>
                    <span class="metric-value">${report.generalStats.averageAnalysisTime.toFixed(2)}ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Cache Hit Rate</span>
                    <span class="metric-value">${(report.generalStats.cacheHitRate * 100).toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Memory Usage</span>
                    <span class="metric-value">${(report.generalStats.memoryUsage / 1024).toFixed(1)} KB</span>
                </div>
            </div>

            <div class="section">
                <h2>💡 Recommendations</h2>
                <div class="recommendations">
                    ${report.recommendations.map(rec => `<div class="recommendation">• ${rec}</div>`).join('')}
                </div>
            </div>

            <div class="section">
                <h2>🗄️ Cache Statistics</h2>
                <div class="cache-section">
                    <div class="cache-item">
                        <h3>Search Cache</h3>
                        <div class="metric">
                            <span>Entries</span>
                            <span>${report.cacheStats.search.totalEntries}</span>
                        </div>
                        <div class="metric">
                            <span>Hit Rate</span>
                            <span>${(report.cacheStats.search.hitRate * 100).toFixed(1)}%</span>
                        </div>
                        <div class="metric">
                            <span>Memory</span>
                            <span>${(report.cacheStats.search.memoryUsage / 1024).toFixed(1)} KB</span>
                        </div>
                    </div>
                    <div class="cache-item">
                        <h3>Filter Cache</h3>
                        <div class="metric">
                            <span>Entries</span>
                            <span>${report.cacheStats.filter.totalEntries}</span>
                        </div>
                        <div class="metric">
                            <span>Hit Rate</span>
                            <span>${(report.cacheStats.filter.hitRate * 100).toFixed(1)}%</span>
                        </div>
                        <div class="metric">
                            <span>Memory</span>
                            <span>${(report.cacheStats.filter.memoryUsage / 1024).toFixed(1)} KB</span>
                        </div>
                    </div>
                    <div class="cache-item">
                        <h3>Group Cache</h3>
                        <div class="metric">
                            <span>Entries</span>
                            <span>${report.cacheStats.group.totalEntries}</span>
                        </div>
                        <div class="metric">
                            <span>Hit Rate</span>
                            <span>${(report.cacheStats.group.hitRate * 100).toFixed(1)}%</span>
                        </div>
                        <div class="metric">
                            <span>Memory</span>
                            <span>${(report.cacheStats.group.memoryUsage / 1024).toFixed(1)} KB</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>📈 Detailed Statistics</h2>
                ${Object.entries(report.detailedStats).map(([operation, stats]) => `
                    <div class="expandable" onclick="toggleDetails('${operation}')">
                        <h3>▶ ${operation}</h3>
                    </div>
                    <div id="${operation}-details" class="details-content">
                        ${stats ? Object.entries(stats).map(([key, value]) => `
                            <div class="metric">
                                <span>${key}</span>
                                <span>${typeof value === 'number' ? value.toFixed(2) : value}</span>
                            </div>
                        `).join('') : 'No data available'}
                    </div>
                `).join('')}
            </div>

            <div class="buttons">
                <button onclick="refreshReport()">🔄 Refresh</button>
                <button onclick="clearCache()">🗑️ Clear Cache</button>
                <button onclick="exportReport()">📄 Export Report</button>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();

            function toggleDetails(operation) {
                const details = document.getElementById(operation + '-details');
                const isVisible = details.style.display === 'block';
                details.style.display = isVisible ? 'none' : 'block';
                
                const arrow = details.previousElementSibling.querySelector('h3');
                arrow.textContent = arrow.textContent.replace(isVisible ? '▼' : '▶', isVisible ? '▶' : '▼');
            }

            function refreshReport() {
                vscode.postMessage({ command: 'refresh' });
            }

            function clearCache() {
                vscode.postMessage({ command: 'clearCache' });
            }

            function exportReport() {
                vscode.postMessage({ command: 'exportReport' });
            }
        </script>
    </body>
    </html>`;
  }

  private async exportReport(report: PerformanceReport): Promise<void> {
    const reportJson = JSON.stringify(report, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `openapi-performance-report-${timestamp}.json`;

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(fileName),
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(reportJson, 'utf8'));
      vscode.window.showInformationMessage(`Performance report exported to ${uri.fsPath}`);
    }
  }

  startPeriodicUpdate(): void {
    setInterval(() => {
      if (this.isMonitoringEnabled) {
        this.updateStatusBar();
        
        // Auto-cleanup caches periodically
        globalCache.cleanup();
      }
    }, 5000); // Update every 5 seconds
  }

  dispose(): void {
    this.statusBarItem.dispose();
    globalDebouncer.cancelAll();
  }
}

// Register commands for performance monitoring
export function registerPerformanceCommands(context: vscode.ExtensionContext): void {
  const monitor = PerformanceMonitorUI.getInstance();
  
  // Start periodic updates
  monitor.startPeriodicUpdate();

  // Register commands
  const showReportCommand = vscode.commands.registerCommand(
    'openapi-enhanced.showPerformanceReport',
    () => monitor.showReport()
  );

  const toggleMonitoringCommand = vscode.commands.registerCommand(
    'openapi-enhanced.togglePerformanceMonitoring',
    () => {
      if (monitor['isMonitoringEnabled']) {
        monitor.disable();
        vscode.window.showInformationMessage('Performance monitoring disabled');
      } else {
        monitor.enable();
        vscode.window.showInformationMessage('Performance monitoring enabled');
      }
    }
  );

  context.subscriptions.push(showReportCommand, toggleMonitoringCommand, monitor);
} 