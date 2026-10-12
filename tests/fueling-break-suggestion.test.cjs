'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const {recommendFuelBreak}=require('../dist/break-suggestion.js');

const recommend=(drivingSinceFullBreakMinutes,values={})=>recommendFuelBreak({
  drivingSinceFullBreakMinutes,
  minutesToRequiredBreak:270-drivingSinceFullBreakMinutes,
  fresh:true,
  splitBreak15Completed:false,
  ...values
});

test('po mniej niz godzinie nie proponuje przerwy',()=>{
  assert.equal(recommend(59).action,'CONTINUE_AFTER_FUELING');
});

test('od godziny do rowno dwoch godzin proponuje 15 minut',()=>{
  assert.equal(recommend(60).durationMinutes,15);
  assert.equal(recommend(120).durationMinutes,15);
});

test('po przekroczeniu dwoch godzin bez pietnastki proponuje 45 minut',()=>{
  assert.equal(recommend(121).durationMinutes,45);
});

test('po potwierdzonej pietnastce przy 3 godz. 30 min proponuje 30 minut',()=>{
  const result=recommend(210,{splitBreak15Completed:true,minutesToRequiredBreak:60});
  assert.equal(result.durationMinutes,30);
});

test('blisko granicy wybiera 45 bez pietnastki i 30 po pietnastce',()=>{
  assert.equal(recommend(200,{minutesToRequiredBreak:45}).durationMinutes,45);
  assert.equal(recommend(200,{minutesToRequiredBreak:45,splitBreak15Completed:true}).durationMinutes,30);
});

test('aktywne zgloszenie nie jest dublowane',()=>{
  const result=recommend(180,{activeReportedBreak:{title:'Przerwa 15 min',plannedMinutes:15}});
  assert.equal(result.action,'KEEP_ACTIVE_REPORT');
});

test('brak swiezych danych nie daje zgody na dalsza jazde',()=>{
  assert.equal(recommendFuelBreak({fresh:false,drivingSinceFullBreakMinutes:90}).action,'CHECK_TACHOGRAPH');
  assert.equal(recommendFuelBreak({fresh:true}).action,'CHECK_TACHOGRAPH');
});
