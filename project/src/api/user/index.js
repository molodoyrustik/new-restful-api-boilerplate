import _ from 'lodash';

import { AsyncRouter } from 'express-async-router';

export default (ctx) => {
  if (!_.has(ctx, 'controllers.User.get')) throw '!controllers.User.get'
  if (!_.has(ctx, 'controllers.User.getWorks')) throw '!controllers.User.getWorks'
  if (!_.has(ctx, 'controllers.User.addWork')) throw '!controllers.User.addWork'
  if (!_.has(ctx, 'controllers.User.getPosts')) throw '!controllers.User.getPosts'
  if (!_.has(ctx, 'controllers.User.addPost')) throw '!controllers.User.addPost'
  if (!_.has(ctx, 'controllers.User.getSkillGroups')) throw '!controllers.User.getSkillGroups'
  if (!_.has(ctx, 'controllers.User.addSkillGroup')) throw '!controllers.User.addSkillGroup'
  if (!_.has(ctx, 'controllers.User.addSkill')) throw '!controllers.User.addSkill'
  if (!_.has(ctx, 'controllers.User.updateSkill')) throw '!controllers.User.updateSkill'

	const api = AsyncRouter();

  api.get('/', ctx.controllers.User.get);
  api.get('/:id/works', ctx.controllers.User.getWorks);
  api.post('/:id/works', ctx.controllers.User.addWork);

  api.get('/:id/posts', ctx.controllers.User.getPosts);
  api.post('/:id/posts', ctx.controllers.User.addPost);

  api.get('/:id/skill-groups', ctx.controllers.User.getSkillGroups);
  api.post('/:id/skill-groups', ctx.controllers.User.addSkillGroup);

  api.post('/:id/skill-groups/:groupId/skills', ctx.controllers.User.addSkill);
  api.put('/:id/skill-groups/:groupId/skills', ctx.controllers.User.updateSkill);

	return api;
}
