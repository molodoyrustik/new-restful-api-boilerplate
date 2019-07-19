import Auth from './Auth/index';
import User from './User/index';

export default function () {
  return {
    Auth: Auth(...arguments),
    User: User(...arguments),
  }
}
