import Button from 'view/components/base/Button';
import Divider from 'view/components/base/Divider';
import Input from 'view/components/base/Input';
import './style.css';

const AccountBill = () => {

  return (
    <div className="container-fluid w-100 account-billing">
      <div className="row">
        <div className="col-6">
          <h5>Your Personal Details</h5>
          <Divider />
          <Input label="First Name" input={{ type: 'text', placeholder: 'First Name', required: true }} />
          <Input label="Last Name" input={{ type: 'text', placeholder: 'Last Name', required: true }} />
          <Input label="Email" input={{ type: 'email', placeholder: 'Email', required: true }} />
          <Input label="Telephone" max={11} input={{ type: 'number', placeholder: 'Telephone', required: true }} />
          <h5>Your Personal Details</h5>
          <Divider />
          <Input label="Password" input={{ type: 'password', placeholder: 'Password', required: true }} />
          <Input label="Last Name" input={{ type: 'text', placeholder: 'Last Name', required: true }} />
        </div>
        <div className="col-6">
          <h5>Your Address</h5>
          <Divider />
          <Input label="Company" input={{ type: 'text', placeholder: 'Company' }} />
          <Input label="Address 1" input={{ type: 'text', placeholder: 'Address 1', required: true }} />
          <Input label="Address 2" input={{ type: 'email', placeholder: 'Address 2' }} />
          <Input label="City" input={{ type: 'text', placeholder: 'City', required: true }} />
          <Input label="Post Code" input={{ type: 'number', placeholder: 'Post Code', required: true }} />
        </div>
      </div>
      <div className="d-flex justify-content-end">
        <Button radius>Continue</Button>
      </div>
    </div>
  );
};

export default AccountBill;
