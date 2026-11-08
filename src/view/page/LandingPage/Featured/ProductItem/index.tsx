import { useAppDispatch, useAppSelector } from 'controllers/app/hooks';
import { categoriesActions, getCategoryById } from 'controllers/feature/categories/categoriesSlice';
import { getProductById, productActions } from 'controllers/feature/product/productSlice';
import { ICartItem } from 'models';
import { FormEvent, MutableRefObject, useEffect, useRef } from 'react';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { useParams } from 'react-router-dom';
import Button from 'view/components/base/Button';
import StarRating from 'view/components/base/ProductCard/StarRating';
import ProductImg from 'view/components/base/ProductImg';
import Banner from 'view/components/layout/Banner';
import Description from './Description';
import RelatedProduct from './RelatedProduct';
import TextField from 'view/components/base/FormikField';
import { Grid, Paper, Typography } from '@mui/material';
import Divider from 'view/components/base/Divider';

const ProductItem = () => {
  //Router
  const params = useParams();
  //Redux
  const dispatch = useAppDispatch();
  const ProductItem = useAppSelector(getProductById);
  const CategoryItem = useAppSelector(getCategoryById);
  //Ref
  const amountInputRef = useRef<HTMLInputElement>(null) as MutableRefObject<HTMLInputElement>;

  useEffect(() => {
    if (params.id) dispatch(productActions.fetchProductById(params.id));
  }, [params.id, dispatch]);

  useEffect(() => {
    if (ProductItem.categoryId)
      dispatch(categoriesActions.fetchCategoryById(ProductItem.categoryId));
  }, [dispatch, ProductItem.categoryId]);

  const handleSubmitQuantity = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const enteredValue = amountInputRef.current.value;
    const enteredValueNumber = +enteredValue;
    if (enteredValue.trim().length === 0 || enteredValueNumber < 1 || enteredValueNumber > 100) {
      return;
    }
    let item = {
      id: ProductItem.id,
      name: ProductItem.name,
      amount: enteredValueNumber,
      price: ProductItem.price,
      imgUrl: ProductItem.imgUrl,
    };
    dispatch(productActions.addItemIntoCart(item as ICartItem));
  };

  return (
    <>
      <Banner name={ProductItem.name} />
      <Paper sx={{ py: 4, px: 23, maxWidth: 2000 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <ProductImg imgUrl={ProductItem.imgUrl} name={ProductItem.name} />
          </Grid>
          <Grid item xs={6} sm container sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography gutterBottom variant="h4" component="div">
              {ProductItem.name}
            </Typography>
            <StarRating starRating={ProductItem.starRating} />
            <Typography variant="subtitle1" component="div">
              <b>${ProductItem.price?.toFixed(2)}</b>
            </Typography>

            <Divider clsName="my-3" />

            <Typography variant="body1" gutterBottom>
              Brand: <b>{ProductItem.brand}</b>
            </Typography>
            <Typography variant="body1" gutterBottom>
              Code: <b>{ProductItem.code}</b>
            </Typography>
            <Typography variant="body1" gutterBottom>
              Description: <b>{ProductItem.description}</b>
            </Typography>
            <Typography variant="body1" gutterBottom>
              Category: <b>{CategoryItem.name}</b>
            </Typography>
            <Typography variant="body1" gutterBottom>
              Created at:{' '}
              <b>{ProductItem.createdAt && new Date(ProductItem.createdAt).toLocaleString()}</b>
            </Typography>

            <form className="mt-3" onSubmit={handleSubmitQuantity}>
              <Grid container spacing={2}>
                <Grid item xs={2}>
                  <TextField size="small" name="amount" label="Amount" type="number" autoFocus={true} defaultValue={1} ref={amountInputRef} />
                </Grid>
                <Grid item xs={6}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<ShoppingCartOutlinedIcon />}
                  >
                    Add to cart
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Grid>
        </Grid>

        <h4 className="mt-3">Description</h4>
        <Description />

        <RelatedProduct categoryItem={CategoryItem} />
      </Paper>

    

      
    </>
  );
};

export default ProductItem;
