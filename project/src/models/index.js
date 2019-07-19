import User from './User/User';

export default function () {
  return {
    User: User(...arguments),
  }
}
