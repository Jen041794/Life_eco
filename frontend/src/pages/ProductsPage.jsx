import { useState } from 'react'
import { Table, Button, Spinner, Alert, Form, InputGroup, Image, Badge } from 'react-bootstrap'
import {
  useGetProductsQuery,
  useDeleteProductMutation,
  useUpdateProductMutation,
} from '../features/api/apiSlice'
import ProductFormModal from '../components/ProductFormModal'
import { formatApiError } from '../utils/formatError'

export default function ProductsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [modalShow, setModalShow] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data, isLoading, isError, isFetching } = useGetProductsQuery({ page, search })
  const [deleteProduct] = useDeleteProductMutation()
  const [updateProduct] = useUpdateProductMutation()

  const openCreate = () => { setEditing(null); setModalShow(true) }
  const openEdit = (p) => { setEditing(p); setModalShow(true) }

  const handleDelete = async (p) => {
    if (!window.confirm(`確定要刪除「${p.name}」嗎？`)) return
    try {
      await deleteProduct(p.id).unwrap()
    } catch (err) {
      alert(formatApiError(err))
    }
  }

  // 列上的快速上/下架：只送 is_active 一個欄位
  const toggleActive = async (p) => {
    const fd = new FormData()
    fd.append('is_active', p.is_active ? 'false' : 'true')
    try {
      await updateProduct({ id: p.id, formData: fd }).unwrap()
    } catch (err) {
      alert(formatApiError(err))
    }
  }

  const submitSearch = (e) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  if (isLoading) return <Spinner animation="border" />
  if (isError) return <Alert variant="danger">載入商品失敗。</Alert>

  const products = data.results
  const hasNext = Boolean(data.next)
  const hasPrev = Boolean(data.previous)

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">商品管理</h4>
        <Button onClick={openCreate}>+ 新增商品</Button>
      </div>

      <Form onSubmit={submitSearch} className="mb-3" style={{ maxWidth: 360 }}>
        <InputGroup>
          <Form.Control
            placeholder="搜尋商品名稱 / 說明"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="outline-secondary">搜尋</Button>
        </InputGroup>
      </Form>

      <Table hover responsive className="align-middle bg-white shadow-sm">
        <thead className="table-light">
          <tr>
            <th>#</th><th style={{ width: 64 }}>圖片</th><th>名稱</th><th>分類</th>
            <th>狀態</th><th className="text-end">價格</th>
            <th className="text-end">庫存</th><th style={{ width: 230 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr><td colSpan={8} className="text-center text-muted py-4">沒有商品</td></tr>
          ) : (
            products.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>
                  {p.images?.length > 0 ? (
                    <Image src={p.images[0].image} thumbnail width={48} height={48} style={{ objectFit: 'cover' }} />
                  ) : (
                    <span className="text-muted small">無圖</span>
                  )}
                </td>
                <td>{p.name}</td>
                <td>
                  {p.category_name
                    ? <Badge bg="info" className="fw-normal">{p.category_name}</Badge>
                    : <span className="text-muted small">—</span>}
                </td>
                <td>
                  {p.is_active
                    ? <Badge bg="success" className="fw-normal">上架中</Badge>
                    : <Badge bg="secondary" className="fw-normal">已下架</Badge>}
                </td>
                <td className="text-end">${p.price}</td>
                <td className="text-end">
                  <span className={p.stock < 5 ? 'text-danger fw-bold' : ''}>{p.stock}</span>
                </td>
                <td>
                  <Button
                    size="sm"
                    variant={p.is_active ? 'outline-secondary' : 'outline-success'}
                    className="me-2"
                    onClick={() => toggleActive(p)}
                  >
                    {p.is_active ? '下架' : '上架'}
                  </Button>
                  <Button size="sm" variant="outline-primary" className="me-2" onClick={() => openEdit(p)}>編輯</Button>
                  <Button size="sm" variant="outline-danger" onClick={() => handleDelete(p)}>刪除</Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <div className="d-flex justify-content-between align-items-center">
        <small className="text-muted">共 {data.count} 筆{isFetching ? '（更新中…）' : ''}</small>
        <div>
          <Button size="sm" variant="outline-secondary" className="me-2"
            disabled={!hasPrev} onClick={() => setPage((p) => p - 1)}>上一頁</Button>
          <Button size="sm" variant="outline-secondary"
            disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>下一頁</Button>
        </div>
      </div>

      <ProductFormModal show={modalShow} onHide={() => setModalShow(false)} product={editing} />
    </>
  )
}
