import { SchemaChange, DiffSummary } from './schema-diff';

export const generateMarkdownReport = (
    schemaAName: string,
    schemaBName: string,
    summary: DiffSummary,
    changes: SchemaChange[]
): string => {
    let report = `# Schema Comparison Report\n\n`;
    report += `**Comparison between \`${schemaAName}\` and \`${schemaBName}\`.**\n\n`;

    report += `## Summary\n\n`;
    report += `- **Total Changes:** ${summary.total}\n`;
    report += `- **Added:** ${summary.added}\n`;
    report += `- **Deleted:** ${summary.deleted}\n`;
    report += `- **Modified:** ${summary.modified}\n`;
    if (summary.breaking > 0) {
        report += `- **Breaking Changes:** ${summary.breaking}\n`;
    }
    report += `\n`;

    report += `## Detailed Changes\n\n`;

    if (changes.length === 0) {
        report += "No differences found.\n";
        return report;
    }

    changes.forEach(change => {
        const path = change.path.join('.');
        report += `### \`${path || 'Root'}\`\n\n`;
        report += `**Type:** \`${change.type}\`\n\n`;

        if (change.type === 'modified') {
            report += `**From:**\n\`\`\`json\n${JSON.stringify(change.lhs, null, 2)}\n\`\`\`\n\n`;
            report += `**To:**\n\`\`\`json\n${JSON.stringify(change.rhs, null, 2)}\n\`\`\`\n\n`;
        } else if (change.type === 'deleted') {
            report += `**Removed Value:**\n\`\`\`json\n${JSON.stringify(change.lhs, null, 2)}\n\`\`\`\n\n`;
        } else if (change.type === 'added') {
            report += `**Added Value:**\n\`\`\`json\n${JSON.stringify(change.rhs, null, 2)}\n\`\`\`\n\n`;
        }
        report += '---\n\n';
    });

    return report;
} 