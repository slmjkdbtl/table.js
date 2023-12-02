// TODO: deal with incorrect initial data

function h(tag, props, children) {
	const el = document.createElement(tag)
	if (props) {
		for (const key in props) {
			el[key] = props[key]
		}
	}
	if (children) {
		if (Array.isArray(children)) {
			for (const child of children) {
				el.appendChild(child)
			}
		} else if (children instanceof HTMLElement) {
			el.appendChild(children)
		} else if (typeof children === "string") {
			el.textContent = children
		}
	}
	return el
}

const initVals = {
	"string": "",
	"number": 0,
	"boolean": false,
}

export default function createTable(opt = {}) {
	if (!opt.columns) throw new Error("Must define columns")
	const data = opt.data ? JSON.parse(JSON.stringify(opt.data)) : []
	const renderRow = (item, i) => h("tr", {
		index: i,
	}, [
		h("td", {}, i + 1 + ""),
		...Object.entries(opt.columns).map(([name, ty]) => {
			if (ty === "string" || ty === "number") {
				return h("td", {
					name: name,
					contentEditable: true,
					onpaste: (e) => {
						e.preventDefault()
						const text = e.clipboardData.getData("text/plain")
						document.execCommand("insertText", false, text)
					},
					oninput: (e) => {
						const cell = e.target
						const row = cell.parentNode
						let val = cell.textContent
						if (ty === "number") {
							const oldVal = val
							val = cell.textContent.replace(/[^\d,.]+/g, "")
							if (val !== oldVal) {
								cell.textContent = val
								return
							}
						}
						data[row.index][cell.name] = val
						if (opt.onChange) opt.onChange(data)
					},
				}, item[name] ?? "")
			} else if (ty === "boolean") {
				return h("td", {}, h("input", {
					type: "checkbox",
					name: name,
					checked: item[name] ?? false,
					oninput: (e) => {
						const cell = e.target
						const row = cell.parentNode.parentNode
						const checked = cell.checked
						data[row.index][cell.name] = checked
						if (opt.onChange) opt.onChange(data)
					},
				}))
			} else if (Array.isArray(ty)) {
				return h("td", {}, h("select", {
					name: name,
					onchange: (e) => {
						const cell = e.target
						const row = cell.parentNode.parentNode
						const val = cell.value
						data[row.index][cell.name] = val
						if (opt.onChange) opt.onChange(data)
					},
				}, ty.map((option) => h("option", {
					value: option,
					selected: item[name] === option,
				}, option))))
			} else {
				throw new Error(`Invalid column type: "${ty}"`)
			}
		}),
		h("td", {}, [
			h("button", {
				row: i,
				onclick: (e) => {
					if (!confirm("Delete this row?")) return
					const row = e.target.parentNode.parentNode
					data.splice(row.index, 1)
					body.removeChild(row)
					body.childNodes.forEach((child, i) => {
						child.index = i
						child.childNodes[0].textContent = i + 1 + ""
					})
					if (opt.onChange) opt.onChange(data)
				},
			}, "x"),
		]),
	])
	const body = h("tbody", {}, data.map(renderRow))
	return h("table", {}, [
		h("tr", {}, [
			h("th"),
			...Object.keys(opt.columns).map((key) => h("th", {}, key)),
			h("th"),
		]),
		body,
		h("tr", {}, [
			h("td", {}, [
				h("button", {
					onclick: () => {
						const row = {}
						for (const [name, ty] of Object.entries(opt.columns)) {
							if (Array.isArray(ty)) {
								row[name] = ty[0]
							} else if (ty in initVals) {
								row[name] = initVals[ty]
							} else {
								throw new Error(`No default value for type "${ty}"`)
							}
						}
						data.push(row)
						body.append(renderRow(row, data.length - 1))
					},
				}, "+"),
			]),
		]),
	])
}
