import { useState, useEffect } from 'react'
import { Modal, Form, Button, Alert, Image } from 'react-bootstrap'
import { useAddProductMutation, useUpdateProductMutation } from '../features/api/apiSlice'
import { formatApiError } from '../utils/formatError'

const empty = { name: '', description: '', price: '', stock: 0 }
const MAX_IMAGES = 3

export default function ProductFormModal({ show, onHide, product }) {
  const isEdit = Boolean(product)
  const [form, setForm] = useState(empty)
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [addProduct, { isLoading: adding }] = useAddProductMutation()
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation()

  useEffect(() => {
    if (show) {
      setForm(product
        ? {
            name: product.name,
            description: product.description || '',
            price: product.price,
            stock: product.stock,
          }
        : empty)
      setFiles([])
      setError('')
    }
  }, [show, product])

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onFiles = (e) => {
    const selected = Array.from(e.target.files)
    if (selected.length > MAX_IMAGES) {
      setError(`最多只能選 ${MAX_IMAGES} 張圖片。`)
      e.target.value = ''
      setFiles([])
      return
    }
    setError('')
    setFiles(selected)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const fd = new FormData()
    fd.append('name', form.name)
    fd.append('description', form.description)
    fd.append('price', form.price)
    fd.append('stock', String(Number(form.stock)))
    files.forEach((f) => fd.append('images', f))

    try {
      if (isEdit) await updateProduct({ id: product.id, formData: fd }).unwrap()
      else await addProduct(fd).unwrap()
      onHide()
    } catch (err) {
      setError(formatApiError(err))
    }
  }

  const existingImages = product?.images ?? []

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title>{isEdit ? '編輯商品' : '新增商品'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2" style={{ whiteSpace: 'pre-line' }}>{error}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>名稱</Form.Label>
            <Form.Control name="name" value={form.name} onChange={change} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>說明</Form.Label>
            <Form.Control as="textarea" rows={2} name="description" value={form.description} onChange={change} />
          </Form.Group>
          <div className="row">
            <Form.Group className="mb-3 col-6">
              <Form.Label>價格</Form.Label>
              <Form.Control name="price" type="number" step="0.01" min="0" value={form.price} onChange={change} required />
            </Form.Group>
            <Form.Group className="mb-3 col-6">
              <Form.Label>庫存</Form.Label>
              <Form.Control name="stock" type="number" min="0" value={form.stock} onChange={change} required />
            </Form.Group>
          </div>

          {/* 編輯時顯示現有圖片 */}
          {isEdit && existingImages.length > 0 && (
            <div className="mb-2">
              <div className="text-muted small mb-1">目前圖片</div>
              <div className="d-flex gap-2 flex-wrap">
                {existingImages.map((img) => (
                  <Image key={img.id} src={img.image} thumbnail width={64} height={64} style={{ objectFit: 'cover' }} />
                ))}
              </div>
            </div>
          )}

          <Form.Group className="mb-1">
            <Form.Label>商品圖片（最多 {MAX_IMAGES} 張）</Form.Label>
            <Form.Control type="file" accept="image/*" multiple onChange={onFiles} />
            <Form.Text className="text-muted">
              {isEdit ? '重新選擇會「取代」現有圖片；不選則保留原圖。' : '可一次選多張（按住 Ctrl/Shift）。'}
              {files.length > 0 && ` 已選 ${files.length} 張。`}
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>取消</Button>
          <Button type="submit" variant="primary" disabled={adding || updating}>
            {adding || updating ? '儲存中…' : '儲存'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
