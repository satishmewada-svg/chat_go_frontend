import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppComponent } from './app';
import { AuthModule } from './features/auth/auth-module';
import { AppRoutingModule } from './app.routes';
import { authInterceptorFn } from './core/interceptors/auth-interceptor';


@NgModule({
  declarations: [
    
  ],
  imports: [
    BrowserModule,
    HttpClientModule,      // MUST be imported
    AuthModule,
    AppRoutingModule,
    AppComponent
  ],
})
export class AppModule { }