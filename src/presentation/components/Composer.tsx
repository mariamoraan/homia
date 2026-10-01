import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useAppContainer } from '@/presentation/app/AppContainerContext'
import { useAppStore } from '@/presentation/store/appStore'
import { QUICK_STARTS } from '@/domain/catalog/TagCatalog'
import {
  detectQuickPrefix,
  isBulletListComposition,
  splitBulletTasks,
  stripQuickPrefix,
} from '@/domain/task/TaskActions'
import { Check, ListChecks, ReactionIcon, SendHorizontal, X } from '@/presentation/icons'
import { es } from '@/presentation/i18n/es'

type ListDraftItem = { key: string; text: string; done: boolean }

function newItemKey(): string {
  return Math.random().toString(36).slice(2, 8)
}

function emptyListItem(): ListDraftItem {
  return { key: newItemKey(), text: '', done: false }
}

export function Composer() {
  const { useCases } = useAppContainer()
  const editingTaskId = useAppStore((s) => s.editingTaskId)
  const session = useAppStore((s) => s.session)
  const stopEdit = useAppStore((s) => s.stopEdit)
  const setStickScroll = useAppStore((s) => s.setStickScroll)
  const [value, setValue] = useState('')
  const [pendingReaction, setPendingReaction] = useState<string | null>(null)
  const [listMode, setListMode] = useState(false)
  const [listTitle, setListTitle] = useState('')
  const [listItems, setListItems] = useState<ListDraftItem[]>([emptyListItem()])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const editingTask = editingTaskId
    ? session.tasks.find((task) => task.id === editingTaskId)
    : null

  useEffect(() => {
    if (editingTask) {
      setPendingReaction(null)
      if (editingTask.checklist.length > 0) {
        setListMode(true)
        setListTitle(editingTask.text)
        setListItems(
          editingTask.checklist.map((item) => ({
            key: item.id,
            text: item.text,
            done: item.done,
          })),
        )
        setValue('')
        requestAnimationFrame(() => titleRef.current?.focus())
      } else {
        setListMode(false)
        setListTitle('')
        setListItems([emptyListItem()])
        setValue(editingTask.text)
        requestAnimationFrame(() => {
          const input = inputRef.current
          if (!input) return
          input.focus()
          autosize(input)
        })
      }
    }
  }, [editingTaskId, editingTask])

  useEffect(() => {
    const onViewportChange = () => {
      if (
        document.activeElement === inputRef.current ||
        document.activeElement === titleRef.current
      ) {
        setStickScroll(true)
      }
    }
    const vv = window.visualViewport
    vv?.addEventListener('resize', onViewportChange)
    return () => vv?.removeEventListener('resize', onViewportChange)
  }, [setStickScroll])

  const autosize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const activePrefix = (): string => {
    if (pendingReaction) {
      const match = QUICK_STARTS.find(([id]) => id === pendingReaction)
      if (match) return match[1]
    }
    return detectQuickPrefix(value.split('\n')[0] ?? '')
  }

  const applyQuickStart = (reactionId: string, prefix: string) => {
    if (editingTaskId) return
    if (listMode) {
      const body = stripQuickPrefix(listTitle)
      setListTitle(prefix + body)
      setPendingReaction(reactionId)
      requestAnimationFrame(() => {
        titleRef.current?.focus()
        const start = prefix.length
        titleRef.current?.setSelectionRange(start, start)
      })
      return
    }
    const body = stripQuickPrefix(value)
    const next = prefix + body
    setValue(next)
    setPendingReaction(reactionId)
    requestAnimationFrame(() => {
      const input = inputRef.current
      if (!input) return
      autosize(input)
      input.focus()
      input.setSelectionRange(prefix.length, prefix.length)
    })
  }

  const toggleListMode = () => {
    if (editingTaskId && editingTask?.checklist.length) return
    if (listMode) {
      const lines = [
        listTitle.trim(),
        ...listItems
          .filter((item) => item.text.trim())
          .map((item) => `- ${item.text.trim()}`),
      ].filter(Boolean)
      setValue(lines.join('\n'))
      setListMode(false)
      setListTitle('')
      setListItems([emptyListItem()])
      requestAnimationFrame(() => {
        const input = inputRef.current
        if (!input) return
        autosize(input)
        input.focus()
      })
      return
    }
    const firstLine = value.split('\n')[0]?.trim() ?? ''
    setListTitle(firstLine)
    setListItems([emptyListItem()])
    setListMode(true)
    setValue('')
    requestAnimationFrame(() => titleRef.current?.focus())
  }

  const resetComposer = () => {
    setValue('')
    setPendingReaction(null)
    setListMode(false)
    setListTitle('')
    setListItems([emptyListItem()])
    requestAnimationFrame(() => {
      if (inputRef.current) {
        autosize(inputRef.current)
        inputRef.current.focus()
      }
    })
  }

  const submit = () => {
    if (listMode) {
      const title = listTitle.trim()
      const items = listItems
        .map((item) => ({
          id: item.key,
          text: item.text.trim(),
          done: item.done,
        }))
        .filter((item) => item.text)
      if (!title && !items.length) {
        titleRef.current?.focus()
        return
      }
      if (editingTaskId) {
        useCases.mutations.updateTaskText.execute(
          editingTaskId,
          title || es.listUntitled,
          items,
        )
        stopEdit()
      } else {
        useCases.mutations.createTask.execute(
          title || es.listUntitled,
          pendingReaction ? [pendingReaction] : [],
          items,
        )
      }
      resetComposer()
      return
    }

    const trimmed = value.trim()
    if (!trimmed) {
      inputRef.current?.focus()
      return
    }

    if (editingTaskId) {
      useCases.mutations.updateTaskText.execute(editingTaskId, trimmed)
      stopEdit()
    } else {
      const split = splitBulletTasks(value)
      const reactions = pendingReaction ? [pendingReaction] : []
      if (split) {
        useCases.mutations.createTasks.execute(split, reactions)
      } else {
        useCases.mutations.createTask.execute(trimmed, reactions)
      }
    }
    resetComposer()
  }

  const insertBulletNewline = () => {
    const input = inputRef.current
    if (!input) return
    const start = input.selectionStart
    const end = input.selectionEnd
    const prefix = activePrefix()
    const insertion = `\n- ${prefix}`
    const next = value.slice(0, start) + insertion + value.slice(end)
    setValue(next)
    requestAnimationFrame(() => {
      const cursor = start + insertion.length
      input.focus()
      input.setSelectionRange(cursor, cursor)
      autosize(input)
    })
  }

  const onTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const isDesktop = window.matchMedia('(hover:hover)').matches
    if (event.key === 'Enter' && !event.shiftKey && isDesktop) {
      event.preventDefault()
      submit()
      return
    }
    const wantsNewline =
      event.key === 'Enter' && (!isDesktop || event.shiftKey)
    if (wantsNewline && isBulletListComposition(value)) {
      event.preventDefault()
      insertBulletNewline()
    }
  }

  const updateListItem = (key: string, text: string) => {
    setListItems((items) =>
      items.map((item) => (item.key === key ? { ...item, text } : item)),
    )
  }

  const toggleListItemDone = (key: string) => {
    setListItems((items) =>
      items.map((item) =>
        item.key === key ? { ...item, done: !item.done } : item,
      ),
    )
  }

  const addListItemAfter = (key: string) => {
    const next = emptyListItem()
    setListItems((items) => {
      const index = items.findIndex((item) => item.key === key)
      if (index < 0) return [...items, next]
      const copy = [...items]
      copy.splice(index + 1, 0, next)
      return copy
    })
    requestAnimationFrame(() => itemRefs.current[next.key]?.focus())
  }

  const onListItemKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    key: string,
  ) => {
    const isDesktop = window.matchMedia('(hover:hover)').matches
    if (event.key === 'Enter' && !event.shiftKey && isDesktop) {
      event.preventDefault()
      submit()
      return
    }
    const wantsNewline =
      event.key === 'Enter' && (!isDesktop || event.shiftKey)
    if (wantsNewline) {
      event.preventDefault()
      addListItemAfter(key)
    }
  }

  const onListTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const isDesktop = window.matchMedia('(hover:hover)').matches
    if (event.key === 'Enter' && !event.shiftKey && isDesktop) {
      event.preventDefault()
      submit()
      return
    }
    const wantsNewline =
      event.key === 'Enter' && (!isDesktop || event.shiftKey)
    if (wantsNewline) {
      event.preventDefault()
      const first = listItems[0]
      if (first) {
        requestAnimationFrame(() => itemRefs.current[first.key]?.focus())
      } else {
        const next = emptyListItem()
        setListItems([next])
        requestAnimationFrame(() => itemRefs.current[next.key]?.focus())
      }
    }
  }

  return (
    <div className="composer">
      <div className="composer__quick">
        <button
          type="button"
          className={`chip chip--quick${listMode ? ' chip--on' : ''}`}
          onClick={toggleListMode}
          aria-pressed={listMode}
        >
          <ListChecks size={14} strokeWidth={2.25} />
          {es.listChip}
        </button>
        {QUICK_STARTS.map(([reactionId, prefix]) => (
          <button
            key={prefix}
            type="button"
            className={`chip chip--quick${pendingReaction === reactionId ? ' chip--on' : ''}`}
            onClick={() => applyQuickStart(reactionId, prefix)}
          >
            <ReactionIcon id={reactionId} size={14} />
            {prefix.replace(/[: ]+$/, '')}
          </button>
        ))}
      </div>
      <div
        className={`composer__editing${editingTaskId ? ' composer__editing--on' : ''}`}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{es.editing}</b>
          <div className="composer__edit-text">{editingTask?.text}</div>
        </div>
        <button
          type="button"
          className="composer__cancel"
          aria-label={es.cancelEdit}
          onClick={() => {
            stopEdit()
            resetComposer()
          }}
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>
      <div className="composer__row">
        {listMode ? (
          <div className="composer__list">
            <input
              ref={titleRef}
              className="composer__list-title"
              type="text"
              placeholder={es.listTitlePlaceholder}
              value={listTitle}
              enterKeyHint="send"
              onChange={(event) => setListTitle(event.target.value)}
              onFocus={() => setStickScroll(true)}
              onKeyDown={onListTitleKeyDown}
            />
            <ul className="composer__list-items">
              {listItems.map((item) => (
                <li key={item.key} className="composer__list-item">
                  <button
                    type="button"
                    className={`composer__list-check${item.done ? ' composer__list-check--on' : ''}`}
                    aria-label={item.done ? es.markPending : es.markDone}
                    onClick={() => toggleListItemDone(item.key)}
                  >
                    <Check size={12} strokeWidth={3} />
                  </button>
                  <input
                    ref={(node) => {
                      itemRefs.current[item.key] = node
                    }}
                    className="composer__list-input"
                    type="text"
                    placeholder={es.listItemPlaceholder}
                    value={item.text}
                    enterKeyHint="enter"
                    onChange={(event) =>
                      updateListItem(item.key, event.target.value)
                    }
                    onFocus={() => setStickScroll(true)}
                    onKeyDown={(event) => onListItemKeyDown(event, item.key)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <textarea
            ref={inputRef}
            className="composer__input"
            rows={1}
            placeholder={es.placeholder}
            enterKeyHint="send"
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              autosize(event.target)
            }}
            onFocus={() => setStickScroll(true)}
            onKeyDown={onTextareaKeyDown}
          />
        )}
        <button
          type="button"
          className="composer__send"
          aria-label={es.send}
          onClick={submit}
        >
          <SendHorizontal size={22} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
