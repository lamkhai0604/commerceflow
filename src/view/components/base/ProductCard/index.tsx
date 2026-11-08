import { ReactNode } from 'react';
import Popup from './Popup';
import StarRating from './StarRating';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import LinkMui from '@mui/material/Link';
import { CardPage } from './style';
import { Link } from 'react-router-dom';

interface IProductCardProps {
  id?: string;
  shadow?: boolean;
  imgUrl?: string;
  name?: string;
  description?: string;
  clsName?: string;
  createAt?: string;
  discount?: number;
  newArrival?: boolean;
  grey?: boolean;
  bottom?: boolean;
  price?: number;
  starRating?: number;
  oldPrice?: number;
  children?: ReactNode;
}

export default function ProductCard(props: IProductCardProps) {
  return (
    <Link to={`product/${props.id}?name=${props.name}`} style={{textDecoration: 'none'}}>
    <Card sx={CardPage}>
      <CardMedia component="img" width="270" height="360" image={props.imgUrl} alt={props.name} />
      <Popup clsName="" />
      <CardContent>
        <StarRating starRating={props.starRating} />
        <LinkMui href={`product/${props.id}?name=${props.name}`} sx={{textDecoration: 'none'}}>
          <Typography variant="subtitle1" gutterBottom component="div">
            {props.name}
          </Typography>
        </LinkMui>
        <Typography variant="subtitle1" display="block" gutterBottom>
          <b>${props.price}</b>
        </Typography>
      </CardContent>
    </Card>
    </Link>
  );
}
