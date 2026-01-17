'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useUi } from '@hit/ui-kit';
import { Workflow } from 'lucide-react';
export function WorkflowGates() {
    const { Page, Card } = useUi();
    return (_jsx(Page, { title: "Workflow Gates", description: "Configure lifecycle gatekeepers (approver assignment)", children: _jsxs(Card, { children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(Workflow, { size: 18 }), _jsx("div", { className: "font-semibold", children: "Workflow gates are currently disabled" })] }), _jsx("div", { className: "text-sm text-gray-500", children: "This area is intentionally inactive while workflows are being refactored." })] }) }));
}
export default WorkflowGates;
