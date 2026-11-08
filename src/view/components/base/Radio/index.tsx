import { useState } from 'react';
import { Radio, FormControlLabel, SxProps, Theme } from '@mui/material';
import { grey } from '@mui/material/colors';

interface IRadioProps {
  checked?: boolean;
  disabled?: boolean;
  value?: string;
  label?: string;
  name?: string;
  className?: string;
  sx?: SxProps<Theme>
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function RadioButtons(props: IRadioProps) {
  const [selectedValue, setSelectedValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedValue((e.target as HTMLInputElement).value);
  };

  return (
    <FormControlLabel
      label={props.label}
      value={props.value}
      name={props.name}
      sx={props.sx}
      className={props.className}
      control={<Radio checked={selectedValue === props.value} disabled={props.disabled} onChange={handleChange} sx={{'&.Mui-checked': {color: grey[900]}}} />}
    />
  );
}
