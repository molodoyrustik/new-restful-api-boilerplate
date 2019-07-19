import uniqid from 'uniqid';

export default (ctx) => {
  const User = ctx.models.User;

  let controller = {};

  controller.get = async function(req, res) {
    const userID = req.user.id;
    const user = await User.findOne({id: userID});

    return res.json(user);
  }

  controller.getWorks = async function(req, res) {
    const userID = req.user.id;
    const user = await User.findOne({ id: userID });

    return res.json(user.works);
  }

  controller.addWork = async function(req, res) {
    const params = req.body
    if (!params.title) {
      return res.status(400).json([{signup: false, message: 'Заполните все поля'}]);
    }
    if (!params.technologies) {
      return res.status(400).json([{signup: false, message: 'Заполните все поля'}]);
    }
    if (!params.imgUrl) {
      return res.status(400).json([{signup: false, message: 'Заполните все поля'}]);
    }

    const { title, technologies, imgUrl, } = params;

    const userID = req.user.id;
    const user = await User.findOne({id: userID});

    const work = {
      id: uniqid(),
      title,
      technologies,
      imgUrl,
    }

    user.works.push(work);
    await user.save();

    return res.json([{ flag: true, message: 'Проект успешно добавлен'}]);
  }


  controller.getPosts = async function(req, res) {
    const userID = req.user.id;
    const user = await User.findOne({ id: userID });

    return res.json(user.posts);
  }

  controller.addPost = async function(req, res) {
    const params = req.body
    if (!params.title) {
      return res.status(400).json([{signup: false, message: 'Заполните все поля'}]);
    }
    if (!params.date) {
      return res.status(400).json([{signup: false, message: 'Заполните все поля'}]);
    }
    if (!params.text) {
      return res.status(400).json([{signup: false, message: 'Заполните все поля'}]);
    }

    const { title, date, text, } = params;

    const userID = req.user.id;
    const user = await User.findOne({id: userID});

    const post = {
      id: uniqid(),
      title,
      date,
      text,
    }

    user.posts.push(post);
    await user.save();

    return res.json([{ flag: true, message: 'Пост успешно добавлен'}]);
  }

  controller.getSkillGroups = async function(req, res) {
    const userID = req.user.id;
    const user = await User.findOne({ id: userID });
    return res.json(user.skillGroups);
  }

  controller.addSkillGroup = async function(req, res) {
    const params = req.body
    if (!params.title) {
      return res.status(400).json([{signup: false, message: 'Заполните все поля'}]);
    }

    const { title } = params;

    const userID = req.user.id;
    const user = await User.findOne({id: userID});

    const skillGroup = {
      id: uniqid(),
      title,
      skills: [],
    }

    user.skillGroups.push(skillGroup);
    await user.save();

    return res.json([{ flag: true, message: 'Группа скиллов успешно добавлен'}]);
  }

  controller.addSkill = async function(req, res) {
    const params = req.body
    if (!params.title) {
      return res.status(400).json([{signup: false, message: 'Заполните все поля'}]);
    }
    if (!params.value) {
      return res.status(400).json([{signup: false, message: 'Заполните все поля'}]);
    }
    if (!params.groupId) {
      return res.status(400).json([{signup: false, message: 'Заполните все поля'}]);
    }

    const { title, value, groupId } = params;

    const userID = req.user.id;
    const user = await User.findOne({id: userID});

    const skill = {
      id: uniqid(),
      title,
      value,
      groupId,
    }

    user.skillGroups.forEach((elem, index) => {
      if (elem.id === groupId) {
        elem.skills.push(skill);
      }
    })
    await user.save();

    return res.json([{ flag: true, message: 'Скилл успешно добавлен'}]);
  }

  controller.updateSkill = async function(req, res) {
    const params = req.body
    if (!params.value) {
      return res.status(400).json([{signup: false, message: 'Заполните все поля'}]);
    }
    if (!params.id) {
      return res.status(400).json([{signup: false, message: 'Заполните все поля'}]);
    }
    if (!params.groupId) {
      return res.status(400).json([{signup: false, message: 'Заполните все поля'}]);
    }

    const { id, value, groupId } = params;

    const userID = req.user.id;
    const user = await User.findOne({id: userID});


    user.skillGroups.forEach((elem, index) => {
      if (elem.id === groupId) {
        elem.skills.forEach((e) => {
          if (e.id === id) {
            e.value = value;
          }
        })
      }
    })
    await user.save();

    return res.json([{ flag: true, message: 'Скилл успешно обнавлен'}]);
  }


  return controller
}
