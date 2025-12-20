'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState, useTransition, type FormEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import * as Dialog from '@radix-ui/react-dialog'
import { z } from 'zod'
import clsx from 'clsx'
import { AlertCircle, Archive as ArchiveIcon, BookOpen, CheckCircle2, CloudUpload, Filter, Loader2, PenSquare, Search } from 'lucide-react'
import { AnalyticsPieChart } from '@/apps/dashboard/app/(admin)/components/AnalyticsCharts'
import { DataTable, type TableColumn } from '@/apps/dashboard/app/(admin)/components/DataTable'
import {
  ACCEPTED_UPLOAD_TYPES,
  ADMIN_MUTATION_STATUSES,
  STATUS_BADGE_TONE,
  STATUS_FILTER_OPTIONS,
  STATUS_LABEL,
  type AdminMutationStatus,
  type BannerState,
  type FilterState,
  type KnowledgeBaseArchiveResponse,
  type KnowledgeBaseDocumentRow,
  type KnowledgeBaseMutationResponse,
  type MetricsSummary,
  type StatusFilterKey,
} from './knowledgeBaseShared'

const STATUS_TONE_CLASSES: Record<'default' | 'success' | 'warning' | 'danger', string> = {
  default: 'bg-white/10 text-white',
  success: 'bg-emerald-400/15 text-emerald-200',
  warning: 'bg-amber-400/15 text-amber-200',
  danger: 'bg-rose-400/15 text-rose-200',
}

const BANNER_VARIANTS: Record<'error' | 'info' | 'success', string> = {
  error: 'border-rose-400/40 bg-rose-400/10 text-rose-100',
  info: 'border-blue-400/40 bg-blue-400/10 text-blue-100',
  success: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
}

type KnowledgeBaseClientProps = {
  documents: KnowledgeBaseDocumentRow[]
  totalMatching: number
  filters: FilterState
  categories: string[]
  metrics: MetricsSummary
  canManage: boolean
  hasMore: boolean
  nextCursor?: string
}

export function KnowledgeBaseClient({
  documents,
  totalMatching,
  filters,
  categories,
  metrics,
  canManage,
  hasMore,
  nextCursor,
}: KnowledgeBaseClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(filters.search)
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>(filters.status)
  const [categoryFilter, setCategoryFilter] = useState(filters.category)
  const [isPending, startTransition] = useTransition()
  const [banner, setBanner] = useState<BannerState>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<KnowledgeBaseDocumentRow | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<KnowledgeBaseDocumentRow | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadForm, setUploadForm] = useState({ title: '', categoryId: '', status: 'draft' as AdminMutationStatus, richText: '' })
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})
  const [editForm, setEditForm] = useState({ title: '', categoryId: '', status: 'draft' as AdminMutationStatus, richText: '' })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  const handleRefresh = useCallback(() => {
    startTransition(() => router.refresh())
  }, [router, startTransition])

  const handleMutationError = useCallback((message: string) => {
    setBanner({ type: 'error', message })
  }, [])

  const uploadMutation = useUploadDocument({
    onSuccess: (response) => {
      handleRefresh()
      setBanner({ type: 'success', message: `Uploaded “${response.document.title}”.` })
      setUploadOpen(false)
      setUploadErrors({})
      setUploadForm({ title: '', categoryId: '', status: 'draft' as AdminMutationStatus, richText: '' })
      setUploadFile(null)
    },
    onError: handleMutationError,
  })

  const editMutation = useEditDocument({
    onSuccess: (response) => {
      handleRefresh()
      setBanner({ type: 'success', message: `Updated “${response.document.title}”.` })
      setEditTarget(null)
      setEditErrors({})
    },
    onError: handleMutationError,
  })

  const archiveMutation = useArchiveDocument({
    onSuccess: (response) => {
      handleRefresh()
      const actionLabel = response.action === 'archived' ? 'Archived' : 'Restored'
      setBanner({ type: 'success', message: `${actionLabel} “${response.document.title}”.` })
      setArchiveTarget(null)
    },
    onError: handleMutationError,
  })

  const uploadSchema = useMemo(
    () =>
      z.object({
        title: z.string().min(3, 'Title must be at least 3 characters'),
        categoryId: z.string().min(2, 'Category is required'),
        status: z.enum(ADMIN_MUTATION_STATUSES),
        richText: z.string().max(4000, 'Notes must be under 4000 characters').optional(),
        file: z
          .any()
          .refine((value) => value == null || value instanceof File, 'Select a supported file.')
          .refine((file) => file == null || file.size <= 20 * 1024 * 1024, 'Max file size is 20MB')
          .refine(
            (file) => file == null || ACCEPTED_UPLOAD_TYPES.includes(file.type as (typeof ACCEPTED_UPLOAD_TYPES)[number]),
            'Unsupported file type'
          ),
      }),
    []
  )

  const editSchema = useMemo(
    () =>
      z.object({
        title: z.string().min(3, 'Title must be at least 3 characters'),
        categoryId: z.string().min(2, 'Category is required'),
        status: z.enum(ADMIN_MUTATION_STATUSES),
        richText: z.string().max(4000, 'Notes must be under 4000 characters').optional(),
      }),
    []
  )

  const categoryOptions = useMemo(() => {
    const set = new Set(categories)
    if (filters.category !== 'all' && !set.has(filters.category)) {
      set.add(filters.category)
    }
    return Array.from(set).sort()
  }, [categories, filters.category])

  const pushParams = (params: URLSearchParams) => {
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
    })
  }

  const handleStatusChange = (value: StatusFilterKey) => {
    setStatusFilter(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('status')
    } else {
      params.set('status', value)
    }
    params.delete('cursor')
    pushParams(params)
  }

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value)
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === 'all') {
      params.delete('category')
    } else {
      params.set('category', value)
    }
    params.delete('cursor')
    pushParams(params)
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (searchTerm.trim().length) {
      params.set('q', searchTerm.trim())
    } else {
      params.delete('q')
    }
    params.delete('cursor')
    pushParams(params)
  }

  const handleResetFilters = () => {
    setStatusFilter('all')
    setCategoryFilter('all')
    setSearchTerm('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('status')
    params.delete('category')
    params.delete('q')
    params.delete('cursor')
    pushParams(params)
  }

  const handleLoadMore = () => {
    if (!nextCursor) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('cursor', nextCursor)
    pushParams(params)
  }

  const handleUploadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = uploadSchema.safeParse({
      title: uploadForm.title.trim(),
      categoryId: uploadForm.categoryId.trim(),
      status: uploadForm.status,
      richText: uploadForm.richText.trim() ? uploadForm.richText.trim() : undefined,
      file: uploadFile,
    })

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0]
        if (typeof path === 'string' && !fieldErrors[path]) {
          fieldErrors[path] = issue.message
        }
      })
      setUploadErrors(fieldErrors)
      return
    }

    setUploadErrors({})
    await uploadMutation.execute({
      title: parsed.data.title,
      categoryId: parsed.data.categoryId,
      status: parsed.data.status,
      richText: parsed.data.richText,
      file: uploadFile,
    })
  }

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editTarget) return

    const parsed = editSchema.safeParse({
      title: editForm.title.trim(),
      categoryId: editForm.categoryId.trim(),
      status: editForm.status,
      richText: editForm.richText.trim() ? editForm.richText.trim() : undefined,
    })

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0]
        if (typeof path === 'string' && !fieldErrors[path]) {
          fieldErrors[path] = issue.message
        }
      })
      setEditErrors(fieldErrors)
      return
    }

    setEditErrors({})
    await editMutation.execute({
      documentId: editTarget.id,
      title: parsed.data.title,
      categoryId: parsed.data.categoryId,
      status: parsed.data.status,
      richText: parsed.data.richText,
    })
  }

  const handleArchiveConfirm = () => {
    if (!archiveTarget) return
    archiveMutation.execute(archiveTarget.id)
  }

  const inputClass = (error?: string) =>
    clsx(
      'w-full rounded-xl border px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400',
      error ? 'border-rose-400/60 bg-rose-400/5' : 'border-white/10 bg-black/40'
    )

  const columns = useMemo<TableColumn<KnowledgeBaseDocumentRow>[]>(
    () => [
      {
        key: 'title',
        header: 'Title',
        sortable: true,
        render: (_value, row) => (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-white">{row.title}</span>
            <span className="text-xs text-white/50">Chunks {row.chunkCount}</span>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        sortable: true,
        render: (value) => <span className="text-sm text-white/70">{String(value)}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (_value, row) => (
          <span
            className={clsx(
              'inline-flex items-center rounded-full px-3 py-1 text-xs uppercase tracking-wide',
              STATUS_TONE_CLASSES[STATUS_BADGE_TONE[row.status]]
            )}
          >
            {STATUS_LABEL[row.status]}
          </span>
        ),
      },
      {
        key: 'updatedAt',
        header: 'Last Updated',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-white/60">
            {formatDistanceToNow(new Date(String(value)), { addSuffix: true })}
          </span>
        ),
      },
      {
        key: 'createdByName',
        header: 'Created By',
        sortable: true,
        render: (_value, row) => (
          <div className="flex flex-col">
            <span className="text-sm text-white/80">{row.createdByName}</span>
            {row.createdByEmail && (
              <a href={`mailto:${row.createdByEmail}`} className="text-xs text-blue-300 hover:text-blue-200">
                {row.createdByEmail}
              </a>
            )}
          </div>
        ),
      },
      {
        key: 'id',
        header: 'Actions',
        render: (_value, row) => (
          <div className="flex justify-end gap-2">
            <Link href={`/dashboard/admin/knowledge-base/documents/${row.id}`} className="text-xs text-blue-300 hover:text-blue-200">
              View
            </Link>
            {canManage && (
              <>
                <button
                  type="button"
                  className="text-xs text-white/70 transition hover:text-white"
                  onClick={() => {
                    setEditTarget(row)
                    setEditErrors({})
                    setEditForm({
                      title: row.title,
                      categoryId: row.category,
                      status: row.status === 'READY' ? 'published' : 'draft',
                      richText: row.description ?? '',
                    })
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-xs text-rose-300 transition hover:text-rose-200"
                  onClick={() => setArchiveTarget(row)}
                >
                  Archive
                </button>
              </>
            )}
          </div>
        ),
      },
    ],
    [canManage]
  )

  const emptyState =
    filters.search || filters.category !== 'all' || filters.status !== 'all'
      ? 'No documents match these filters.'
      : canManage
      ? 'No knowledge base documents yet. Upload one to train the assistant.'
      : 'No knowledge base documents available yet.'

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 text-blue-300/80">
          <BookOpen className="h-6 w-6" />
          <p className="text-xs uppercase tracking-[0.4em]">Knowledge Base</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">AI Learning Hub</h1>
            <p className="text-sm text-white/60">Supervise content quality and embedding freshness.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15"
            >
              <Filter className="h-4 w-4" /> Clear filters
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                <CloudUpload className="h-4 w-4" /> Upload new document
              </button>
            )}
          </div>
        </div>
      </div>

      {banner && (
        <div className={clsx('rounded-xl border px-4 py-3 text-sm', BANNER_VARIANTS[banner.type])}>
          <div className="flex items-start gap-3">
            {banner.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4" />
            )}
            <p className="flex-1">{banner.message}</p>
            <button
              type="button"
              className="text-xs text-white/70 transition hover:text-white"
              onClick={() => setBanner(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 lg:col-span-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/60">
            <span>Status distribution</span>
            <span>Updated {formatDistanceToNow(new Date(metrics.generatedAt), { addSuffix: true })}</span>
          </div>
          <div className="mt-4 h-56">
            <AnalyticsPieChart data={metrics.chartData} ariaLabel="Knowledge base status distribution" />
          </div>
          <p className="mt-3 text-xs text-white/50">
            TODO: Wire pie chart to knowledgeBaseQueue metrics once ingestion telemetry is available.
          </p>
        </div>
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
          <MetricStat label="Total documents" value={metrics.total} />
          <MetricStat label="Ready for search" value={metrics.published} />
          <MetricStat label="Draft / processing" value={metrics.draft} />
          <MetricStat label="Archived" value={metrics.archived} />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-4">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
            <Search className="h-4 w-4 text-white/40" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title or metadata value"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(event) => handleStatusChange(event.target.value as StatusFilterKey)}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(event) => handleCategoryChange(event.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            Apply
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between text-sm text-white/60">
          <span>
            {totalMatching} {totalMatching === 1 ? 'document' : 'documents'}
          </span>
          {canManage ? (
            <span>Actions available: edit, archive, upload.</span>
          ) : (
            <span>Contact an owner or manager to manage documents.</span>
          )}
        </div>

        {isPending ? (
          <KnowledgeBaseTableSkeleton />
        ) : (
          <DataTable columns={columns} data={documents} emptyState={emptyState} />
        )}

        {!isPending && documents.length === 0 && canManage && (
          <div className="rounded-2xl border border-dashed border-white/20 bg-black/30 p-8 text-center text-white/60">
            <p>No documents yet. Upload content to teach the assistant.</p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
              onClick={() => setUploadOpen(true)}
            >
              <CloudUpload className="h-4 w-4" /> Upload your first document
            </button>
          </div>
        )}

        {hasMore && nextCursor && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleLoadMore}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Load more
            </button>
          </div>
        )}
      </section>

      <Dialog.Root
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open)
          if (!open) {
            setUploadErrors({})
            setUploadForm({ title: '', categoryId: '', status: 'draft' as AdminMutationStatus, richText: '' })
            setUploadFile(null)
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-slate-950/95 p-8 shadow-xl focus:outline-none">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <Dialog.Title className="text-xl font-semibold text-white">Upload new document</Dialog.Title>
                <Dialog.Description className="text-sm text-white/60">
                  Accepts PDF, DOCX, and images. Rich text notes are optional.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="rounded-full bg-white/10 px-3 py-1 text-sm text-white transition hover:bg-white/20" aria-label="Close upload modal">
                  Close
                </button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Title</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(event) => setUploadForm((state) => ({ ...state, title: event.target.value }))}
                  className={inputClass(uploadErrors.title)}
                  placeholder="Guest welcome playbook"
                />
                {uploadErrors.title && <p className="text-xs text-rose-300">{uploadErrors.title}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Category</label>
                <input
                  type="text"
                  value={uploadForm.categoryId}
                  onChange={(event) => setUploadForm((state) => ({ ...state, categoryId: event.target.value }))}
                  className={inputClass(uploadErrors.categoryId)}
                  placeholder="Housekeeping SOP"
                />
                {uploadErrors.categoryId && <p className="text-xs text-rose-300">{uploadErrors.categoryId}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Publishing status</label>
                <select
                  value={uploadForm.status}
                  onChange={(event) => setUploadForm((state) => ({ ...state, status: event.target.value as AdminMutationStatus }))}
                  className={inputClass(uploadErrors.status)}
                >
                  <option value="draft">Draft (keep private)</option>
                  <option value="published">Published (searchable)</option>
                </select>
                {uploadErrors.status && <p className="text-xs text-rose-300">{uploadErrors.status}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">File</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.png,.jpg,.jpeg"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  className={inputClass(uploadErrors.file)}
                />
                {uploadErrors.file && <p className="text-xs text-rose-300">{uploadErrors.file}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Optional notes</label>
                <textarea
                  value={uploadForm.richText}
                  onChange={(event) => setUploadForm((state) => ({ ...state, richText: event.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Add context or summarise the document..."
                />
              </div>
              <p className="text-xs text-white/40">
                TODO: Connect binary upload to storage service and trigger targeted re-embedding jobs via knowledgeBaseQueue.
              </p>
              <div className="flex justify-end gap-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={uploadMutation.isLoading}
                >
                  {uploadMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                  {uploadMutation.isLoading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null)
            setEditErrors({})
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-slate-950/95 p-8 shadow-xl focus:outline-none">
            <div className="mb-6 flex items-center gap-3 text-white">
              <PenSquare className="h-5 w-5 text-blue-300" />
              <Dialog.Title className="text-xl font-semibold">Edit document</Dialog.Title>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(event) => setEditForm((state) => ({ ...state, title: event.target.value }))}
                  className={inputClass(editErrors.title)}
                />
                {editErrors.title && <p className="text-xs text-rose-300">{editErrors.title}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Category</label>
                <input
                  type="text"
                  value={editForm.categoryId}
                  onChange={(event) => setEditForm((state) => ({ ...state, categoryId: event.target.value }))}
                  className={inputClass(editErrors.categoryId)}
                />
                {editErrors.categoryId && <p className="text-xs text-rose-300">{editErrors.categoryId}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Publishing status</label>
                <select
                  value={editForm.status}
                  onChange={(event) => setEditForm((state) => ({ ...state, status: event.target.value as AdminMutationStatus }))}
                  className={inputClass(editErrors.status)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
                {editErrors.status && <p className="text-xs text-rose-300">{editErrors.status}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Body</label>
                <textarea
                  value={editForm.richText}
                  onChange={(event) => setEditForm((state) => ({ ...state, richText: event.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Add or refine the assistant-facing summary..."
                />
              </div>
              <p className="text-xs text-white/40">TODO: Trigger embedding refresh when publishing changes affect retrieval relevance.</p>
              <div className="flex justify-end gap-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={editMutation.isLoading}
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={editMutation.isLoading}
                >
                  {editMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editMutation.isLoading ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null)
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-slate-950/95 p-8 shadow-xl focus:outline-none">
            <div className="mb-4 flex items-center gap-3 text-white">
              <ArchiveIcon className="h-5 w-5 text-rose-300" />
              <Dialog.Title className="text-lg font-semibold">Archive document</Dialog.Title>
            </div>
            <p className="text-sm text-white/70">
              Archiving hides the document from search while keeping history for audits. You can restore it later.
            </p>
            <p className="mt-3 text-xs text-white/50">TODO: Trigger vector cleanup & rehydration jobs once archive workflow is wired to the queue.</p>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={archiveMutation.isLoading && archiveMutation.activeId === archiveTarget?.id}
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={handleArchiveConfirm}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={archiveMutation.isLoading && archiveMutation.activeId === archiveTarget?.id}
              >
                {archiveMutation.isLoading && archiveMutation.activeId === archiveTarget?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {archiveTarget?.status === 'ARCHIVED'
                  ? archiveMutation.isLoading && archiveMutation.activeId === archiveTarget?.id
                    ? 'Restoring…'
                    : 'Confirm restore'
                  : archiveMutation.isLoading && archiveMutation.activeId === archiveTarget?.id
                  ? 'Archiving…'
                  : 'Confirm archive'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

const MetricStat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
    <p className="text-xs uppercase tracking-wide text-white/50">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
  </div>
)

function KnowledgeBaseTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="h-12 bg-white/10" />
      <div className="divide-y divide-white/10 bg-black/40">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse bg-white/5" />
        ))}
      </div>
    </div>
  )
}

// TODO: Add unit tests for upload/edit/archive hooks covering success/error paths and RBAC enforcement.

type UploadPayload = {
  title: string
  categoryId: string
  status: AdminMutationStatus
  richText?: string
  file: File | null
}

type EditPayload = {
  documentId: string
  title: string
  categoryId: string
  status: AdminMutationStatus
  richText?: string
}

type MutationCallbacks<T> = {
  onSuccess: (response: T) => void
  onError: (message: string) => void
}

function useUploadDocument(callbacks: MutationCallbacks<KnowledgeBaseMutationResponse>) {
  const [isLoading, setIsLoading] = useState(false)

  const execute = useCallback(
    async (payload: UploadPayload) => {
      setIsLoading(true)
      try {
        const formData = new FormData()
        formData.append('title', payload.title)
        formData.append('categoryId', payload.categoryId)
        formData.append('status', payload.status)
        if (payload.richText) {
          formData.append('richText', payload.richText)
        }
        if (payload.file) {
          formData.append('file', payload.file)
        }

        const response = await fetch('/api/admin/kb/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message ?? 'Upload failed')
        }

        const data: KnowledgeBaseMutationResponse = await response.json()
        callbacks.onSuccess(data)
      } catch (error) {
        callbacks.onError(error instanceof Error ? error.message : 'Upload failed')
      } finally {
        setIsLoading(false)
      }
    },
    [callbacks]
  )

  return { execute, isLoading }
}

function useEditDocument(callbacks: MutationCallbacks<KnowledgeBaseMutationResponse>) {
  const [isLoading, setIsLoading] = useState(false)

  const execute = useCallback(
    async (payload: EditPayload) => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/admin/kb/${payload.documentId}/edit`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: payload.title,
            categoryId: payload.categoryId,
            status: payload.status,
            richText: payload.richText,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message ?? 'Edit failed')
        }

        const data: KnowledgeBaseMutationResponse = await response.json()
        callbacks.onSuccess(data)
      } catch (error) {
        callbacks.onError(error instanceof Error ? error.message : 'Edit failed')
      } finally {
        setIsLoading(false)
      }
    },
    [callbacks]
  )

  return { execute, isLoading }
}

function useArchiveDocument(callbacks: MutationCallbacks<KnowledgeBaseArchiveResponse>) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const execute = useCallback(
    async (documentId: string) => {
      setIsLoading(true)
      setActiveId(documentId)
      try {
        const response = await fetch(`/api/admin/kb/${documentId}/archive`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message ?? 'Archive operation failed')
        }

        const data: KnowledgeBaseArchiveResponse = await response.json()
        callbacks.onSuccess(data)
      } catch (error) {
        callbacks.onError(error instanceof Error ? error.message : 'Archive operation failed')
      } finally {
        setIsLoading(false)
        setActiveId(null)
      }
    },
    [callbacks]
  )

  return { execute, isLoading, activeId }
}
