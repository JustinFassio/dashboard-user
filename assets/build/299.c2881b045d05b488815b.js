"use strict";(globalThis.webpackChunkathlete_dashboard_child=globalThis.webpackChunkathlete_dashboard_child||[]).push([[299],{299:(e,s,i)=>{i.d(s,{OverviewFeature:()=>c});var t=i(848);i(609);const r=({userId:e,context:s})=>(0,t.jsxs)("div",{className:"overview-layout",children:[(0,t.jsxs)("header",{className:"overview-header",children:[(0,t.jsx)("h1",{children:"Dashboard Overview"}),(0,t.jsx)("p",{children:"Welcome to your athlete dashboard overview."})]}),(0,t.jsxs)("div",{className:"overview-content",children:[(0,t.jsxs)("section",{className:"overview-section",children:[(0,t.jsx)("h2",{children:"Quick Stats"}),(0,t.jsxs)("div",{className:"stats-grid",children:[(0,t.jsxs)("div",{className:"stat-card",children:[(0,t.jsx)("h3",{children:"Workouts"}),(0,t.jsx)("p",{className:"stat-value",children:"0"})]}),(0,t.jsxs)("div",{className:"stat-card",children:[(0,t.jsx)("h3",{children:"Active Goals"}),(0,t.jsx)("p",{className:"stat-value",children:"0"})]}),(0,t.jsxs)("div",{className:"stat-card",children:[(0,t.jsx)("h3",{children:"Progress"}),(0,t.jsx)("p",{className:"stat-value",children:"0%"})]})]})]}),(0,t.jsxs)("section",{className:"overview-section",children:[(0,t.jsx)("h2",{children:"Recent Activity"}),(0,t.jsx)("div",{className:"activity-list",children:(0,t.jsx)("p",{className:"empty-state",children:"No recent activity to display."})})]}),(0,t.jsxs)("section",{className:"overview-section",children:[(0,t.jsx)("h2",{children:"Next Steps"}),(0,t.jsxs)("ul",{className:"next-steps-list",children:[(0,t.jsx)("li",{children:"Complete your profile"}),(0,t.jsx)("li",{children:"Set your fitness goals"}),(0,t.jsx)("li",{children:"Schedule your first workout"})]})]})]}),s.debug&&(0,t.jsxs)("div",{className:"debug-info",children:[(0,t.jsx)("h3",{children:"Debug Information"}),(0,t.jsx)("pre",{children:JSON.stringify({userId:e,context:s},null,2)})]})]});class c{constructor(){this.identifier="overview",this.metadata={name:"Overview",description:"Goal Compass",order:0},this.context=null}async register(e){this.context=e,e.debug&&console.log("Overview feature registered")}async init(){this.context?.debug&&console.log("Overview feature initialized")}async cleanup(){this.context=null}isEnabled(){return!0}render({userId:e}){return this.context?(0,t.jsx)(r,{userId:e,context:this.context}):(console.error("Overview feature context not initialized"),null)}}}}]);