
// Ícone: Zoom In
export function IconZoomIn(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" {...props}>
			<rect x="3" y="3" width="18" height="18" rx="4"/>
			<path d="M12 8v8M8 12h8"/>
		</svg>
	);
}

// Ícone: Zoom Out
export function IconZoomOut(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" {...props}>
			<rect x="3" y="3" width="18" height="18" rx="4"/>
			<path d="M8 12h8"/>
		</svg>
	);
}

// Ícone: Fullscreen
export function IconFullscreen(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" {...props}>
			<path d="M4 9V4h5"/>
			<path d="M20 9V4h-5"/>
			<path d="M4 15v5h5"/>
			<path d="M20 15v5h-5"/>
		</svg>
	);
}

// Ícone: Sair do Fullscreen
export function IconExitFullscreen(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" {...props}>
			<path d="M9 4H4v5"/>
			<path d="M15 4h5v5"/>
			<path d="M9 20H4v-5"/>
			<path d="M20 20h-5v-5"/>
		</svg>
	);
}

// Ícone: Polígono
export function IconPolygon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" {...props}>
			<polygon points="7 3 17 3 21 9 17 21 7 21 3 9"/>
			<circle cx="7" cy="3" r="1.5" fill="currentColor" stroke="none"/>
			<circle cx="17" cy="3" r="1.5" fill="currentColor" stroke="none"/>
			<circle cx="21" cy="9" r="1.5" fill="currentColor" stroke="none"/>
			<circle cx="17" cy="21" r="1.5" fill="currentColor" stroke="none"/>
			<circle cx="7" cy="21" r="1.5" fill="currentColor" stroke="none"/>
			<circle cx="3" cy="9" r="1.5" fill="currentColor" stroke="none"/>
		</svg>
	);
}

// Ícone: Importar
export function IconImport(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" {...props}>
			<path d="M12 3v10"/>
			<path d="M8 9l4 4 4-4"/>
			<rect x="4" y="17" width="16" height="4" rx="1"/>
		</svg>
	);
}

// Ícone: Exportar
export function IconExport(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" {...props}>
			<path d="M12 21V11"/>
			<path d="M8 15l4 4 4-4"/>
			<rect x="4" y="3" width="16" height="4" rx="1"/>
		</svg>
	);
}

// Ícone: Limpar
export function IconTrash(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" {...props}>
			<path d="M3 6h18"/>
			<path d="M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
			<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
			<path d="M10 11v6M14 11v6"/>
		</svg>
	);
}
