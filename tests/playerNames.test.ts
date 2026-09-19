import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterChatText } from '../shared/src/chatFilter';
import { suggestedNames } from '../client/src/playerNames';
test('every generated name passes the server name filter',()=>{
  assert.ok(suggestedNames.length>0);
  for(const name of suggestedNames) assert.equal(filterChatText(name,{extraPhrases:['admin','administrator','moderator','mod','system','server','owner']}),name);
});
