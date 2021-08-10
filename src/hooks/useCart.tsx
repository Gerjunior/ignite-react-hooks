import { createContext, ReactNode, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const findProductInCart = (productId: number) => {
    return cart.find(item => item.id === productId)
  }

  const addProduct = async (productId: number) => {
    try {
      const productInCart = findProductInCart(productId)

      if (!productInCart) {
        const { data: product } = await api.get<Product>(`/products/${productId}`)

        const updatedProduct = { ...product, amount: 1 }
        const newCart = [...cart, updatedProduct]

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
        setCart(newCart)

        return;
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`)

      if (productInCart.amount >= stock.amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }

      const updatedProduct: Product = { ...productInCart, amount: productInCart.amount + 1 }
      const cartWithoutUpdatedProduct = cart.filter(item => item.id !== productId)
      const newCart = [...cartWithoutUpdatedProduct, updatedProduct]

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      setCart(newCart)
    } catch (err: any) {
      toast.error('Erro na adição do produto')
    }
  }

  const removeProduct = (productId: number) => {
    try {
      const productInCart = findProductInCart(productId)

      if (!productInCart) {
        throw new Error()
      }

      const cartWithoutItem = cart.filter(item => item.id !== productId)

      setCart(cartWithoutItem)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartWithoutItem))
    } catch (err: any) {
      toast.error('Erro na remoção do produto')
    }
  }

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`)
      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }

      console.log({ amount, stock })

      const cartCopy = [...cart];
      const productIndex = cartCopy.findIndex(item => item.id === productId)
      cartCopy[productIndex].amount = amount

      setCart(cartCopy)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartCopy))
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  }

  return <CartContext.Provider value={{ cart, addProduct, removeProduct, updateProductAmount }}>{children}</CartContext.Provider>
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
