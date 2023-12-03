// TODO: drag & drop index to reorder
// TODO: undo / redo

function h(tag, props, children) {
	const el = document.createElement(tag)
	if (props) {
		for (const key in props) {
			el[key] = props[key]
		}
	}
	if (children !== undefined) {
		if (Array.isArray(children)) {
			for (const child of children) {
				if (child) {
					el.appendChild(child)
				}
			}
		} else if (children instanceof HTMLElement) {
			el.appendChild(children)
		} else if (typeof children === "string" || typeof children === "number") {
			el.textContent = children
		}
	}
	return el
}

// TODO: is this not as performant?
const cloneData = (data) => JSON.parse(JSON.stringify(data))

function createEvent() {
	const actions = []
	return {
		count: () => actions.length,
		clear: () => actions = [],
		// TODO: return canceller
		add: (action) => actions.push(action),
		trigger: (...args) => actions.forEach((action) => action(...args)),
	}
}

export default function createTable(opt = {}) {

	if (!opt.columns)
		throw new Error("Must define columns")

	// TODO: deal with incorrect initial data
	const data = opt.data ? cloneData(opt.data) : []
	const changeEvent = createEvent()

	if (opt.onChange) {
		changeEvent.add(opt.onChange)
	}

	const change = () => {
		if (changeEvent.count() > 0) {
			changeEvent.trigger(cloneData(data))
		}
	}

	const readonly = opt.readonly === true

	const renderRow = (item, i) => h("tr", {
		index: i,
	}, [
		h("td", {}, i + 1 + ""),
		...Object.entries(opt.columns).map(([name, ty]) => {
			if (ty === "string" || ty === "number") {
				return h("td", {
					name: name,
					contentEditable: !readonly,
					onpaste: (e) => {
						if (readonly) return
						e.preventDefault()
						const text = e.clipboardData.getData("text/plain")
						document.execCommand("insertText", false, text)
					},
					oninput: (e) => {
						if (readonly) return
						const cell = e.target
						const row = cell.parentNode
						let val = cell.textContent
						if (ty === "number") {
							const oldVal = val
							val = cell.textContent.replace(/[^\d.]+/g, "")
							if (val === oldVal) {
								data[row.index][cell.name] = Number(val)
								change()
							} else {
								cell.textContent = val
							}
						} else {
							data[row.index][cell.name] = val
							change()
						}
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
						if (readonly) {
							e.target.checked = data[row.index][cell.name]
							return
						}
						const checked = cell.checked
						data[row.index][cell.name] = checked
						change()
					},
				}))
			} else if (Array.isArray(ty)) {
				return h("td", {}, readonly ? item[name] ?? "" : h("select", {
					name: name,
					onchange: (e) => {
						const cell = e.target
						const row = cell.parentNode.parentNode
						const val = cell.value
						data[row.index][cell.name] = val
						change()
					},
				}, ty.map((option) => h("option", {
					value: option,
					selected: item[name] === option,
				}, option))))
			} else {
				throw new Error(`Invalid column type: "${ty}"`)
			}
		}),
		!readonly && h("td", {}, [
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
					change()
				},
			}, "x"),
		]),
	])

	const rowElements = h("tbody", {}, data.map(renderRow))

	const tableElement = h("table", {}, [
		h("tr", {}, [
			h("th"),
			...Object.keys(opt.columns).map((key) => h("th", {}, key)),
			!readonly && h("th"),
		]),
		rowElements,
		!readonly && h("tr", {}, [
			h("td", {}, [
				h("button", {
					onclick: () => {
						const initVals = {
							"string": "",
							"number": 0,
							"boolean": false,
						}
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

	return {
		dom: tableElement,
		getData: () => cloneData(data),
		onChange: (action) => changeEvent.add(action),
	}

}
