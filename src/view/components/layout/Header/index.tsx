import { Grid, Typography } from '@mui/material';
import { AiOutlineSearch } from 'react-icons/ai';
import { Link } from 'react-router-dom';
import CustomLink from 'view/components/base/CustomLink';
import Cart from './Cart';
import Dropdown from './Dropdown';
import './style.css';

const Header = () => {
  return (
    <Grid container spacing={12}>
      <Grid item xs={4} sx={{ textAlign: 'center', margin: 'auto' }}>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <CustomLink className="header-menu_link" to="/">
              Home
            </CustomLink>
          </Grid>
          <Grid item xs={4}>
            <CustomLink className="header-menu_link" to="specials">
              Specials
            </CustomLink>
          </Grid>
          <Grid item xs={4}>
            <CustomLink className="header-menu_link" to="information">
              About us
            </CustomLink>
          </Grid>
        </Grid>
      </Grid>

      <Grid item xs={4}>
        <Link className="header-logo" to="/">
          <span>Hello</span>Shop
        </Link>
      </Grid>

      <Grid item xs={3} sx={{ textAlign: 'center', margin: 'auto' }}>
        <Grid container>
          <Grid item sx={{ margin: 'auto' }}>
            <Typography variant="h6" gutterBottom component="div">
              <Dropdown />
            </Typography>
          </Grid>
          <Grid item sx={{ margin: 'auto' }}>
            <Typography variant="h6" gutterBottom component="div" sx={{ cursor: 'pointer' }}>
              <AiOutlineSearch />
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Cart />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default Header;
