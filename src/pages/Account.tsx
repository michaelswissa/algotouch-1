
import { Navigate } from 'react-router-dom';

const Account = () => {
  // Simply redirect to the Profile page
  return <Navigate to="/profile" replace />;
};

export default Account;
