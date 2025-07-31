import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Partlistcomponent } from './partlistcomponent';

describe('Partlistcomponent', () => {
  let component: Partlistcomponent;
  let fixture: ComponentFixture<Partlistcomponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Partlistcomponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Partlistcomponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
