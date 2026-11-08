import { useAppSelector } from 'controllers/app/hooks';
import { getCartItems, getTotalAmount } from 'controllers/feature/product/productSlice';

const ConfirmOrder = () => {
  //Redux
  const CartItems = useAppSelector(getCartItems);
  const totalAmount = useAppSelector(getTotalAmount);
  return (
    <>
      <table className="table table-bordered">
        <thead>
          <tr>
            <th scope="col">Product Name</th>
            <th scope="col">Model</th>
            <th scope="col">Quantity</th>
            <th scope="col">Unit Price</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {CartItems &&
            CartItems.map((item) => {
              return (
                <tr key={item.id}>
                  <th className="fw-normal">{item.name}</th>
                  <td>Model</td>
                  <td>{item.amount}</td>
                  <td>${item.price}</td>
                  <td>${(item.amount * item.price).toFixed(2)}</td>
                </tr>
              );
            })}

          <tr>
            <td colSpan={4}>
              <span className="d-flex justify-content-end fw-bold">Sub-Total:</span>
            </td>
            <td>
              <span className="d-flex justify-content-end">${totalAmount.toFixed(2)}</span>
            </td>
          </tr>
          <tr>
            <td colSpan={4}>
              <span className="d-flex justify-content-end fw-bold">Flat Shipping Rate:</span>
            </td>
            <td>
              <span className="d-flex justify-content-end">twitter</span>
            </td>
          </tr>
          <tr>
            <td colSpan={4}>
              <span className="d-flex justify-content-end fw-bold">Eco Tax (-2.00):</span>
            </td>
            <td>
              <span className="d-flex justify-content-end">twitter</span>
            </td>
          </tr>
          <tr>
            <td colSpan={4}>
              <span className="d-flex justify-content-end fw-bold">VAT (20%):</span>
            </td>
            <td>
              <span className="d-flex justify-content-end">${(totalAmount * 0.2).toFixed(2)}</span>
            </td>
          </tr>
          <tr>
            <td colSpan={4}>
              <span className="d-flex justify-content-end fw-bold">Total:</span>
            </td>
            <td>
              <span className="d-flex justify-content-end">${(totalAmount + (totalAmount * 0.2)).toFixed(2)}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
};

export default ConfirmOrder;
