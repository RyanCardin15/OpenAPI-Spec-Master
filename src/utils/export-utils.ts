import jsPDF from 'jspdf';
import { EndpointData, FilterState } from '../types/openapi';

export interface ExportOptions {
  includeDeprecated: boolean;
  includeBusinessContext: boolean;
  includeAISuggestions: boolean;
  includeCodeExamples: boolean;
  format: 'summary' | 'detailed';
}

export class ExportUtils {
  static async exportToJSON(endpoints: EndpointData[], options: ExportOptions): Promise<void> {
    const data = this.prepareExportData(endpoints, options);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    this.downloadFile(blob, 'api-documentation.json');
  }

  static async exportToCSV(endpoints: EndpointData[], options: ExportOptions): Promise<void> {
    const headers = [
      'Method',
      'Path',
      'Summary',
      'Description',
      'Tags',
      'Deprecated',
      'Parameters Count',
      'Response Codes'
    ];

    if (options.includeBusinessContext) {
      headers.push('Business Context');
    }

    const rows = endpoints.map(endpoint => {
      const row = [
        endpoint.method,
        endpoint.path,
        endpoint.summary || '',
        endpoint.description || '',
        endpoint.tags.join(', '),
        endpoint.deprecated ? 'Yes' : 'No',
        endpoint.parameters.length.toString(),
        Object.keys(endpoint.responses).join(', ')
      ];

      if (options.includeBusinessContext) {
        row.push(endpoint.businessContext || '');
      }

      return row;
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    this.downloadFile(blob, 'api-documentation.csv');
  }

  static async exportToMarkdown(endpoints: EndpointData[], options: ExportOptions): Promise<void> {
    let markdown = '# API Documentation\n\n';
    markdown += `Generated on ${new Date().toLocaleDateString()}\n\n`;
    markdown += `## Overview\n\n`;
    markdown += `This document contains ${endpoints.length} API endpoints.\n\n`;

    // Table of Contents
    markdown += '## Table of Contents\n\n';
    endpoints.forEach((endpoint, index) => {
      const anchor = `${endpoint.method.toLowerCase()}-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
      markdown += `- [${endpoint.method} ${endpoint.path}](#${anchor})\n`;
    });
    markdown += '\n';

    // Endpoints
    markdown += '## Endpoints\n\n';
    endpoints.forEach((endpoint, index) => {
      const anchor = `${endpoint.method.toLowerCase()}-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
      
      markdown += `### ${endpoint.method} ${endpoint.path} {#${anchor}}\n\n`;
      
      if (endpoint.summary) {
        markdown += `**Summary:** ${endpoint.summary}\n\n`;
      }
      
      if (endpoint.description) {
        markdown += `**Description:** ${endpoint.description}\n\n`;
      }

      if (endpoint.tags.length > 0) {
        markdown += `**Tags:** ${endpoint.tags.join(', ')}\n\n`;
      }

      if (endpoint.deprecated) {
        markdown += `> ⚠️ **This endpoint is deprecated**\n\n`;
      }

      if (options.includeBusinessContext && endpoint.businessContext) {
        markdown += `**Business Context:** ${endpoint.businessContext}\n\n`;
      }

      if (options.includeAISuggestions && endpoint.aiSuggestions && endpoint.aiSuggestions.length > 0) {
        markdown += `**AI Suggestions:**\n`;
        endpoint.aiSuggestions.forEach(suggestion => {
          markdown += `- ${suggestion}\n`;
        });
        markdown += '\n';
      }

      // Parameters
      if (endpoint.parameters.length > 0) {
        markdown += `#### Parameters\n\n`;
        markdown += `| Name | In | Type | Required | Description |\n`;
        markdown += `|------|----|----- |----------|-------------|\n`;
        endpoint.parameters.forEach(param => {
          markdown += `| ${param.name} | ${param.in} | ${param.schema?.type || 'N/A'} | ${param.required ? 'Yes' : 'No'} | ${param.description || 'N/A'} |\n`;
        });
        markdown += '\n';
      }

      // Responses
      markdown += `#### Responses\n\n`;
      markdown += `| Status Code | Description |\n`;
      markdown += `|-------------|-------------|\n`;
      Object.entries(endpoint.responses).forEach(([code, response]) => {
        markdown += `| ${code} | ${response.description} |\n`;
      });
      markdown += '\n';

      // Code Example
      if (options.includeCodeExamples) {
        markdown += `#### Example\n\n`;
        markdown += '```bash\n';
        markdown += this.generateCurlExample(endpoint);
        markdown += '\n```\n\n';
      }

      markdown += '---\n\n';
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    this.downloadFile(blob, 'api-documentation.md');
  }

  static async exportToPDF(endpoints: EndpointData[], options: ExportOptions): Promise<void> {
    const pdf = new jsPDF();
    let yPosition = 20;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;

    // Title
    pdf.setFontSize(20);
    pdf.text('API Documentation', margin, yPosition);
    yPosition += 15;

    pdf.setFontSize(12);
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 10;
    pdf.text(`${endpoints.length} endpoints`, margin, yPosition);
    yPosition += 20;

    endpoints.forEach((endpoint, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = 20;
      }

      // Endpoint header
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${endpoint.method} ${endpoint.path}`, margin, yPosition);
      yPosition += 10;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(10);

      if (endpoint.summary) {
        pdf.text(`Summary: ${endpoint.summary}`, margin, yPosition);
        yPosition += 8;
      }

      if (endpoint.tags.length > 0) {
        pdf.text(`Tags: ${endpoint.tags.join(', ')}`, margin, yPosition);
        yPosition += 8;
      }

      if (endpoint.deprecated) {
        pdf.setTextColor(255, 0, 0);
        pdf.text('DEPRECATED', margin, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 8;
      }

      if (options.includeBusinessContext && endpoint.businessContext) {
        const lines = pdf.splitTextToSize(`Business Context: ${endpoint.businessContext}`, 170);
        pdf.text(lines, margin, yPosition);
        yPosition += lines.length * 6;
      }

      yPosition += 10;
    });

    pdf.save('api-documentation.pdf');
  }

  private static prepareExportData(endpoints: EndpointData[], options: ExportOptions) {
    return {
      meta: {
        exportedAt: new Date().toISOString(),
        totalEndpoints: endpoints.length,
        format: options.format,
        options: options
      },
      endpoints: endpoints.map(endpoint => {
        const exportedEndpoint: any = {
          id: endpoint.id,
          path: endpoint.path,
          method: endpoint.method,
          summary: endpoint.summary,
          description: endpoint.description,
          tags: endpoint.tags,
          deprecated: endpoint.deprecated,
          parameters: endpoint.parameters,
          responses: endpoint.responses
        };

        if (options.includeBusinessContext) {
          exportedEndpoint.businessContext = endpoint.businessContext;
        }

        if (options.includeAISuggestions) {
          exportedEndpoint.aiSuggestions = endpoint.aiSuggestions;
        }

        if (options.includeCodeExamples) {
          exportedEndpoint.codeExample = this.generateCurlExample(endpoint);
        }

        return exportedEndpoint;
      })
    };
  }

  private static generateCurlExample(endpoint: EndpointData): string {
    const method = endpoint.method.toLowerCase();
    let curl = `curl -X ${endpoint.method} "${endpoint.path}"`;
    
    if (endpoint.parameters?.some(p => p.in === 'header')) {
      curl += ` \\\n  -H "Content-Type: application/json"`;
    }
    
    if (endpoint.requestBody && (method === 'post' || method === 'put' || method === 'patch')) {
      curl += ` \\\n  -d '{"example": "data"}'`;
    }
    
    return curl;
  }

  private static downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}