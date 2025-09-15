export async function loadIcon(name: string) {
    const response = await fetch(`/icons/${name}.json`);
    return await response.json();
}

export async function loadSvg(name: string) {
    const data = await fetch(`/icons/${name}.svg`);
    const text = await data.text();
    return text;
}

export function downloadJSON(name: string, content: any) {
    let a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(content)], { type: 'application/json' }));
    a.download = `${name}.json`;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
}

export function downloadSVG(name: string, content: string) {
    let a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'image/svg+xml' }));
    a.download = `${name}.svg`;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
}

export function initSvgPreview(element: HTMLElement, content: string) {
    const parser = new DOMParser();
    const document = parser.parseFromString(content, "image/svg+xml");

    element.appendChild(document.documentElement);

    element.addEventListener("click", (e) => {
        e.preventDefault();

        downloadSVG("file", content);
    });
}