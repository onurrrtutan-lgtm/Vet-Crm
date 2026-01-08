import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { productsAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';

const categoryOptions = [
  { value: 'food', label: 'Mama', icon: '🍖' },
  { value: 'medicine', label: 'İlaç', icon: '💊' },
  { value: 'accessory', label: 'Aksesuar', icon: '🎀' },
];

const unitOptions = ['kg', 'g', 'adet', 'kutu', 'şişe', 'paket'];

const ProductsPage = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'food',
    brand: '',
    unit: 'kg',
    price: '',
    stock_quantity: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data);
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : null,
        stock_quantity: formData.stock_quantity ? parseFloat(formData.stock_quantity) : 0
      };
      
      if (editingProduct) {
        await productsAPI.update(editingProduct.product_id, data);
        toast.success(t('success'));
      } else {
        await productsAPI.create(data);
        toast.success(t('success'));
      }
      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('error'));
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      brand: product.brand || '',
      unit: product.unit,
      price: product.price || '',
      stock_quantity: product.stock_quantity || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
    try {
      await productsAPI.delete(productId);
      toast.success(t('success'));
      fetchProducts();
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'food',
      brand: '',
      unit: 'kg',
      price: '',
      stock_quantity: ''
    });
  };

  const getCategoryInfo = (category) => {
    return categoryOptions.find(c => c.value === category) || categoryOptions[0];
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="products-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">{t('products')}</h1>
          <p className="text-muted-foreground">Ürün ve stok yönetimi</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#0F4C5C] hover:bg-[#0A3A46]" data-testid="add-product-btn">
              <Plus className="w-4 h-4 mr-2" />
              {t('add_product')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editingProduct ? t('edit') : t('add_product')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product_name">{t('product_name')} *</Label>
                <Input
                  id="product_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="product-name-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('category')} *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger data-testid="product-category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.icon} {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">{t('brand')}</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    data-testid="product-brand-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('unit')} *</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  >
                    <SelectTrigger data-testid="product-unit-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">{t('price')} (₺)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    data-testid="product-price-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">{t('stock')}</Label>
                <Input
                  id="stock"
                  type="number"
                  step="0.1"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  data-testid="product-stock-input"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" className="bg-[#0F4C5C] hover:bg-[#0A3A46]" data-testid="save-product-btn">
                  {t('save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products List */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">{t('loading')}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('no_data')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('product_name')}</TableHead>
                  <TableHead>{t('category')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('brand')}</TableHead>
                  <TableHead>{t('stock')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('price')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const categoryInfo = getCategoryInfo(product.category);
                  return (
                    <TableRow key={product.product_id} data-testid={`product-row-${product.product_id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{categoryInfo.icon}</span>
                          {product.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-[#E0ECE4] text-[#0F4C5C]">
                          {categoryInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{product.brand || '-'}</TableCell>
                      <TableCell>
                        <span className={product.stock_quantity < 5 ? 'text-red-600 font-medium' : ''}>
                          {product.stock_quantity} {product.unit}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatCurrency(product.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                            data-testid={`edit-product-${product.product_id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.product_id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`delete-product-${product.product_id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsPage;
